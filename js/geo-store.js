/*
 * geo-store.js — 业务数据层
 * 风险规则、状态机、巡查周期、历史追溯、localStorage 持久化、演示种子数据
 */
(function (global) {
  'use strict';
  var STORE_KEY = 'geo-hazard-system-v1';
  var PERSON_PER_HH = 4; // 威胁人数按每户 4 人估算

  var SOIL_TYPES = ['坚硬岩', '较软岩', '碎石土', '黏性土', '黄土', '填土'];
  var TOWNSHIPS = ['青溪镇', '石坎乡', '云岭镇', '白沙乡'];
  var TYPES = ['滑坡', '崩塌'];

  var ROLES = {
    investigator: { name: '调查员（县地灾办）', user: '王调查' },
    reviewer: { name: '审核员', user: '李审核' },
    patrol: { name: '乡镇巡查员', user: '张巡查' }
  };

  var RISK_META = {
    '高风险': { color: '#e5484d', rank: 4 },
    '中风险': { color: '#f08c2e', rank: 3 },
    '低风险': { color: '#f5c542', rank: 2 },
    '一般': { color: '#67c23a', rank: 1 }
  };

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  }
  function fmtDate(d) {
    d = d || new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function dayStr(d) {
    d = d || new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function addDays(base, n) {
    var d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  }

  /* ---------------- 风险评分 ---------------- */
  function calcRisk(h) {
    var score = 0;
    var s = h.slopeDeg || 0;
    if (s >= 35) score += 40;
    else if (s >= 25) score += 28;
    else if (s >= 15) score += 15;
    else score += 6;
    if ((h.catchArea || 0) >= 3000) score += 25;
    else if (h.catchArea >= 1000) score += 18;
    else if (h.catchArea >= 300) score += 10;
    else score += 4;
    if ((h.households || 0) >= 20) score += 20;
    else if (h.households >= 8) score += 14;
    else if (h.households >= 1) score += 8;
    if (['黏性土', '黄土', '填土'].indexOf(h.soilType) >= 0) score += 15;
    else if (h.soilType === '碎石土') score += 10;
    else score += 4;
    if (s >= 45 || (h.slopeHeight || 0) >= 60) score += 6;
    var level = score >= 80 ? '高风险' : score >= 60 ? '中风险' : score >= 40 ? '低风险' : '一般';
    return { score: score, level: level };
  }

  function threatenedPersons(h) {
    return (h.households || 0) * PERSON_PER_HH;
  }

  /* ---------------- 种子数据 ---------------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makePolygon(cx, cz, r, rand, n) {
    var pts = [];
    for (var i = 0; i < (n || 7); i++) {
      var ang = (i / (n || 7)) * Math.PI * 2;
      var rr = r * (0.75 + rand() * 0.5);
      pts.push({ x: Math.round((cx + Math.cos(ang) * rr) * 10) / 10,
        z: Math.round((cz + Math.sin(ang) * rr) * 10) / 10 });
    }
    return pts;
  }

  function samplePhoto(label) {
    // 以 SVG dataURL 模拟现场照片占位（避免依赖外部图片）
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">' +
      '<rect width="320" height="200" fill="#7d8f69"/>' +
      '<path d="M0 150 L90 70 L170 130 L240 60 L320 120 L320 200 L0 200Z" fill="#5d6e4c"/>' +
      '<text x="160" y="105" font-size="22" fill="#fff" text-anchor="middle" font-family="sans-serif">' + label + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function buildSeed(houses, steepSites, evaluateFn) {
    var rand = rng(778899);
    var hazards = [];
    var now = Date.now();

    function baseHazard(idx, township, type, polygon, extra) {
      var ev = evaluateFn(polygon);
      var h = Object.assign({
        id: uid('HZ'),
        code: 'YH-' + String(idx).padStart(4, '0'),
        name: township + (type === '滑坡' ? '后山坡' : '鹰嘴岩') + (idx > 2 ? '隐患点' : '隐患点'),
        type: type,
        township: township,
        polygon: polygon,
        centroid: ev.centroid,
        area: ev.area,
        slopeDeg: ev.slope,
        catchArea: ev.catchArea,
        slopeHeight: Math.round(18 + rand() * 45),
        households: Math.round(2 + rand() * 24),
        soilType: SOIL_TYPES[Math.floor(rand() * SOIL_TYPES.length)],
        recheckConfirmed: false,
        photos: [samplePhoto('现场全景'), samplePhoto('坡体裂缝')],
        evacuationRoute: '',
        nearHouses: ev.nearHouses,
        redFlag: ev.redFlag,
        createdAt: fmtDate(new Date(now - (12 - idx) * 86400000)),
        createdBy: ROLES.investigator.user,
        status: '待核查',
        history: [],
        patrols: []
      }, extra || {});
      var r = calcRisk(h);
      h.riskScore = r.score; h.riskLevel = r.level;
      h.persons = threatenedPersons(h);
      h.history.push({ at: h.createdAt, by: ROLES.investigator.user, action: '圈定隐患点', detail: type + '，' + h.slopeDeg + '°，' + h.households + '户' });
      return h;
    }

    // H1：红色预警点（陡坡+下方民房），待核查
    var s0 = steepSites[0];
    var h1 = baseHazard(1, TOWNSHIPS[0], '滑坡', makePolygon(s0.steep.x, s0.steep.z, 16, rand));
    hazards.push(h1);

    // H2：第二个红色点，且已经过复核确认、待审核
    var s1 = steepSites[1];
    var h2 = baseHazard(2, TOWNSHIPS[1], '崩塌', makePolygon(s1.steep.x, s1.steep.z, 15, rand), {
      status: '待审核', recheckConfirmed: true
    });
    h2.history.push({ at: fmtDate(new Date(now - 6 * 86400000)), by: ROLES.investigator.user, action: '红色复核确认', detail: '陡坡下方民房已现场核实，已通知住户' });
    h2.history.push({ at: fmtDate(new Date(now - 5 * 86400000)), by: ROLES.investigator.user, action: '提交审核' });
    hazards.push(h2);

    // H3：已退回，要求补照片和撤离路线
    var c3 = houses[8] ? { x: houses[8].x + 34, z: houses[8].z + 34 } : { x: -120, z: -80 };
    var h3 = baseHazard(3, TOWNSHIPS[2], '滑坡', makePolygon(c3.x, c3.z, 22, rand), {
      status: '已退回', photos: [samplePhoto('现场全景')]
    });
    h3.history.push({ at: fmtDate(new Date(now - 4 * 86400000)), by: ROLES.investigator.user, action: '提交审核' });
    h3.history.push({ at: fmtDate(new Date(now - 3 * 86400000)), by: ROLES.reviewer.user,
      action: '审核退回', detail: '缺少坡脚照片，未标注撤离路线' });
    hazards.push(h3);

    // H4：已确认，巡查周期 7 天，含 2 次巡查（一次逾期、一次正常）
    var c4 = houses[14] ? { x: houses[14].x - 30, z: houses[14].z - 30 } : { x: 90, z: 60 };
    var h4 = baseHazard(4, TOWNSHIPS[0], '滑坡', makePolygon(c4.x, c4.z, 26, rand), {
      status: '已确认', confirmedAt: fmtDate(new Date(now - 20 * 86400000)),
      patrolCycle: 7, township: TOWNSHIPS[0],
      evacuationRoute: '沿村道向南撤至青溪镇中心小学安置点（约 600m）'
    });
    h4.history.push({ at: fmtDate(new Date(now - 21 * 86400000)), by: ROLES.investigator.user, action: '提交审核' });
    h4.history.push({ at: fmtDate(new Date(now - 20 * 86400000)), by: ROLES.reviewer.user, action: '审核通过', detail: '生成巡查任务，周期 7 天' });
    h4.patrols.push({
      id: uid('PT'), at: fmtDate(new Date(now - 16 * 86400000)), by: ROLES.patrol.user,
      crackStatus: '无明显变化', signStatus: '警示牌完好', newCrack: false, photos: [samplePhoto('巡查打卡1')],
      note: '坡脚排水沟通畅', dueAt: dayStr(new Date(now - 15 * 86400000)), onTime: false
    });
    h4.history.push({ at: fmtDate(new Date(now - 16 * 86400000)), by: ROLES.patrol.user, action: '巡查打卡（逾期1天）' });
    h4.patrols.push({
      id: uid('PT'), at: fmtDate(new Date(now - 8 * 86400000)), by: ROLES.patrol.user,
      crackStatus: '原有裂缝宽度稳定（3mm）', signStatus: '警示牌完好', newCrack: false, photos: [samplePhoto('巡查打卡2')],
      note: '', dueAt: dayStr(new Date(now - 8 * 86400000)), onTime: true
    });
    h4.history.push({ at: fmtDate(new Date(now - 8 * 86400000)), by: ROLES.patrol.user, action: '巡查打卡（按期）' });
    h4.nextDueAt = dayStr(addDays(new Date(now - 8 * 86400000), 7));
    hazards.push(h4);

    // H5：已确认，巡查周期 15 天，最近一次发现新增裂缝 → 待复核
    var c5 = houses[20] ? { x: houses[20].x + 28, z: houses[20].z - 26 } : { x: -60, z: 140 };
    var h5 = baseHazard(5, TOWNSHIPS[3], '崩塌', makePolygon(c5.x, c5.z, 18, rand), {
      status: '待复核', patrolCycle: 15,
      evacuationRoute: '沿白沙河北岸撤至白沙乡文化站安置点（约 450m）'
    });
    h5.history.push({ at: fmtDate(new Date(now - 18 * 86400000)), by: ROLES.investigator.user, action: '提交审核' });
    h5.history.push({ at: fmtDate(new Date(now - 17 * 86400000)), by: ROLES.reviewer.user, action: '审核通过', detail: '生成巡查任务，周期 15 天' });
    h5.patrols.push({
      id: uid('PT'), at: fmtDate(new Date(now - 15 * 86400000)), by: ROLES.patrol.user,
      crackStatus: '未见新增裂缝', signStatus: '警示牌完好', newCrack: false, photos: [samplePhoto('巡查打卡3')],
      note: '', dueAt: dayStr(new Date(now - 15 * 86400000)), onTime: true
    });
    h5.patrols.push({
      id: uid('PT'), at: fmtDate(new Date(now - 2 * 86400000)), by: ROLES.patrol.user,
      crackStatus: '坡体中部发现新增裂缝，长约 2.1m、宽 8mm', signStatus: '警示牌轻微倾斜',
      newCrack: true, photos: [samplePhoto('新增裂缝'), samplePhoto('警示牌')],
      note: '连续降雨后出现，已拉设警戒线', dueAt: dayStr(new Date(now - 2 * 86400000)), onTime: true
    });
    h5.history.push({ at: fmtDate(new Date(now - 2 * 86400000)), by: ROLES.patrol.user, action: '上报新增裂缝', detail: '自动触发复核流程' });
    h5.nextDueAt = dayStr(addDays(new Date(now - 2 * 86400000), 15));
    hazards.push(h5);

    // H6：已销号
    var c6 = { x: 170, z: -160 };
    var h6 = baseHazard(6, TOWNSHIPS[2], '滑坡', makePolygon(c6.x, c6.z, 14, rand), {
      status: '已销号', households: 0
    });
    h6.history.push({ at: fmtDate(new Date(now - 30 * 86400000)), by: ROLES.investigator.user, action: '提交审核' });
    h6.history.push({ at: fmtDate(new Date(now - 29 * 86400000)), by: ROLES.reviewer.user, action: '审核通过' });
    h6.history.push({ at: fmtDate(new Date(now - 6 * 86400000)), by: ROLES.reviewer.user, action: '核准销号', detail: '工程治理完成，连续两个雨季无变形迹象' });
    hazards.push(h6);

    return {
      version: 1,
      houses: houses.map(function (h) { return { x: h.x, z: h.z }; }),
      hazards: hazards,
      seq: 7
    };
  }

  /* ---------------- Store ---------------- */
  function Store() {
    this.state = {
      role: 'investigator',
      hazards: [],
      houses: [],
      seq: 1,
      booted: false
    };
    this.listeners = [];
    this.load();
  }

  Store.prototype.subscribe = function (fn) { this.listeners.push(fn); };
  Store.prototype.emit = function () {
    var self = this;
    this.listeners.forEach(function (fn) { fn(self.state); });
    this.save();
  };

  Store.prototype.load = function () {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        this.state.hazards.splice(0, this.state.hazards.length);
        this.state.hazards.push.apply(this.state.hazards, data.hazards || []);
        this.state.houses.splice(0, this.state.houses.length);
        this.state.houses.push.apply(this.state.houses, data.houses || []);
        this.state.seq = data.seq || 1;
        this.state.role = data.role || 'investigator';
        this.state.booted = true;
      }
    } catch (e) { console.warn('存储读取失败', e); }
  };
  Store.prototype.save = function () {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        hazards: this.state.hazards, houses: this.state.houses,
        seq: this.state.seq, role: this.state.role, version: 1
      }));
    } catch (e) { console.warn('存储写入失败', e); }
  };
  Store.prototype.reset = function (seedData) {
    this.state.hazards.splice(0, this.state.hazards.length);
    this.state.hazards.push.apply(this.state.hazards, seedData.hazards);
    this.state.houses.splice(0, this.state.houses.length);
    this.state.houses.push.apply(this.state.houses, seedData.houses);
    this.state.seq = seedData.seq;
    this.emit();
  };

  Store.prototype.setRole = function (role) { this.state.role = role; this.emit(); };

  Store.prototype._log = function (h, action, detail) {
    h.history.unshift({ at: fmtDate(), by: ROLES[this.state.role].user, action: action, detail: detail || '' });
  };

  Store.prototype.get = function (id) {
    return this.state.hazards.find(function (h) { return h.id === id; });
  };

  Store.prototype.createHazard = function (form, ev) {
    var idx = this.state.seq++;
    var h = {
      id: uid('HZ'),
      code: 'YH-' + String(idx).padStart(4, '0'),
      name: form.name, type: form.type, township: form.township,
      polygon: form.polygon, centroid: ev.centroid, area: ev.area,
      slopeDeg: ev.slope, catchArea: ev.catchArea,
      slopeHeight: form.slopeHeight, households: form.households,
      persons: form.households * PERSON_PER_HH, soilType: form.soilType,
      recheckConfirmed: false, photos: form.photos || [], evacuationRoute: '',
      nearHouses: ev.nearHouses, redFlag: ev.redFlag,
      status: '待核查', createdAt: fmtDate(), createdBy: ROLES[this.state.role].user,
      history: [], patrols: []
    };
    var r = calcRisk(h);
    h.riskScore = r.score; h.riskLevel = r.level;
    h.history.push({ at: h.createdAt, by: h.createdBy, action: '圈定隐患点',
      detail: h.type + '，' + h.slopeDeg + '°，' + h.households + '户，风险' + h.riskLevel + (h.redFlag ? '（红色预警）' : '') });
    this.state.hazards.push(h);
    this.emit();
    return h;
  };

  Store.prototype.updateHazard = function (id, patch, action, detail) {
    var h = this.get(id);
    if (!h) return;
    Object.assign(h, patch);
    if (patch.households !== undefined) h.persons = patch.households * PERSON_PER_HH;
    var r = calcRisk(h);
    h.riskScore = r.score; h.riskLevel = r.level;
    if (action) this._log(h, action, detail);
    this.emit();
  };

  Store.prototype.confirmRecheck = function (id) {
    var h = this.get(id);
    h.recheckConfirmed = true;
    this._log(h, '红色复核确认', '坡度' + h.slopeDeg + '°，下方10m内民房 ' + h.nearHouses.length + ' 栋，已现场核实');
    this.emit();
  };

  Store.prototype.submitReview = function (id) {
    var h = this.get(id);
    if (h.redFlag && !h.recheckConfirmed) return { ok: false, msg: '红色预警点须先完成现场复核确认' };
    h.status = '待审核';
    this._log(h, '提交审核');
    this.emit();
    return { ok: true };
  };

  Store.prototype.returnHazard = function (id, reason) {
    var h = this.get(id);
    h.status = '已退回';
    this._log(h, '审核退回', reason);
    this.emit();
  };

  Store.prototype.approveHazard = function (id, cycle) {
    var h = this.get(id);
    h.status = '已确认';
    h.confirmedAt = fmtDate();
    h.patrolCycle = cycle;
    var d = new Date();
    h.nextDueAt = dayStr(addDays(d, cycle));
    this._log(h, '审核通过', '生成巡查任务，派至' + h.township + '，周期 ' + cycle + ' 天');
    this.emit();
  };

  Store.prototype.resubmit = function (id, patch) {
    var h = this.get(id);
    Object.assign(h, patch);
    h.status = '待审核';
    this._log(h, '补充材料并重新提交',
      (patch.photos ? '补充照片 ' + patch.photos.length + ' 张；' : '') + (patch.evacuationRoute ? '已标注撤离路线' : ''));
    this.emit();
  };

  Store.prototype.checkIn = function (id, rec) {
    var h = this.get(id);
    var today = new Date();
    var due = h.nextDueAt ? new Date(h.nextDueAt + 'T23:59:59') : today;
    var onTime = today <= due;
    var entry = {
      id: uid('PT'), at: fmtDate(), by: ROLES[this.state.role].user,
      crackStatus: rec.crackStatus, signStatus: rec.signStatus,
      newCrack: !!rec.newCrack, photos: rec.photos || [], note: rec.note || '',
      dueAt: h.nextDueAt || dayStr(today), onTime: onTime
    };
    h.patrols.unshift(entry);
    h.nextDueAt = dayStr(addDays(today, h.patrolCycle || 7));
    this._log(h, '巡查打卡' + (onTime ? '（按期）' : '（逾期）'),
      rec.newCrack ? '上报新增裂缝并附照片，触发复核流程' : rec.crackStatus);
    if (rec.newCrack) {
      h.status = '待复核';
      this._log(h, '状态变更', '已确认 → 待复核（新增裂缝）');
    }
    this.emit();
  };

  Store.prototype.resolveRecheck = function (id, conclusion) {
    var h = this.get(id);
    h.status = '已确认';
    this._log(h, '复核结论', conclusion);
    this.emit();
  };

  Store.prototype.closeHazard = function (id, reason) {
    var h = this.get(id);
    h.status = '已销号';
    h.closedAt = fmtDate();
    this._log(h, '核准销号', reason);
    this.emit();
  };

  /* ---------------- 派生统计 ---------------- */
  Store.prototype.isOverdue = function (h) {
    if (h.status !== '已确认' || !h.nextDueAt) return false;
    return new Date() > new Date(h.nextDueAt + 'T23:59:59');
  };

  Store.prototype.dashboard = function () {
    var self = this;
    var rows = TOWNSHIPS.map(function (t) {
      var list = self.state.hazards.filter(function (h) { return h.township === t && h.status !== '已销号'; });
      return {
        township: t,
        total: list.length,
        high: list.filter(function (h) { return h.riskLevel === '高风险'; }).length,
        persons: list.reduce(function (s, h) { return s + h.persons; }, 0),
        overdue: list.filter(function (h) { return self.isOverdue(h); }).length,
        pending: list.filter(function (h) { return h.status === '待核查' || h.status === '待复核'; }).length
      };
    });
    var active = this.state.hazards.filter(function (h) { return h.status !== '已销号'; });
    return {
      rows: rows,
      totals: {
        hazards: active.length,
        persons: active.reduce(function (s, h) { return s + h.persons; }, 0),
        red: active.filter(function (h) { return h.redFlag; }).length,
        overdue: active.filter(function (h) { return self.isOverdue(h); }).length,
        review: this.state.hazards.filter(function (h) { return h.status === '待审核'; }).length,
        recheck: this.state.hazards.filter(function (h) { return h.status === '待复核'; }).length
      }
    };
  };

  Store.prototype.ledgerRows = function () {
    return this.state.hazards.map(function (h) {
      return {
        编号: h.code, 名称: h.name, 类型: h.type, 乡镇: h.township,
        风险等级: h.riskLevel, 风险评分: h.riskScore,
        坡度: h.slopeDeg + '°', 坡高: h.slopeHeight + 'm',
        汇水面积: h.catchArea + 'm²', 岩土类型: h.soilType,
        威胁户数: h.households, 威胁人数: h.persons,
        红色预警: h.redFlag ? '是' : '否', 状态: h.status,
        巡查周期: (h.patrolCycle || '-') + (h.patrolCycle ? '天' : ''),
        下次巡查: h.nextDueAt || '-',
        撤离路线: h.evacuationRoute || '-',
        建档时间: h.createdAt
      };
    });
  };

  Store.prototype.exportCSV = function () {
    var rows = this.ledgerRows();
    if (!rows.length) return '';
    var headers = Object.keys(rows[0]);
    var esc = function (v) {
      v = String(v == null ? '' : v).replace(/"/g, '""');
      return /[",\n]/.test(v) ? '"' + v + '"' : v;
    };
    var lines = ['﻿' + headers.join(',')];
    rows.forEach(function (r) { lines.push(headers.map(function (k) { return esc(r[k]); }).join(',')); });
    return lines.join('\n');
  };

  global.GeoStore = {
    Store: Store, calcRisk: calcRisk, threatenedPersons: threatenedPersons,
    buildSeed: buildSeed, samplePhoto: samplePhoto,
    SOIL_TYPES: SOIL_TYPES, TOWNSHIPS: TOWNSHIPS, TYPES: TYPES, ROLES: ROLES,
    RISK_META: RISK_META, fmtDate: fmtDate, dayStr: dayStr, uid: uid
  };
})(typeof window !== 'undefined' ? window : globalThis);
