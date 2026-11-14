// 应用入口：注册全部 Web Components
import { AppRoot } from './ui/app-root';
import { DashboardPage } from './ui/dashboard-page';
import { EditorPage } from './ui/editor-page';
import { ReviewListPage } from './ui/review-list-page';
import { ReviewDetailPage } from './ui/review-detail-page';
import { AdminPage } from './ui/admin-page';
import { StatsPage } from './ui/stats-page';
import { PatientPage } from './ui/patient-page';

const components: [string, CustomElementConstructor][] = [
  ['app-root', AppRoot],
  ['dashboard-page', DashboardPage],
  ['editor-page', EditorPage],
  ['review-list-page', ReviewListPage],
  ['review-detail-page', ReviewDetailPage],
  ['admin-page', AdminPage],
  ['stats-page', StatsPage],
  ['patient-page', PatientPage],
];

for (const [name, ctor] of components) {
  if (!customElements.get(name)) customElements.define(name, ctor);
}
