import { TASK_STATUS } from '../lib/store.jsx'

export default function TaskStatusPill({ status }) {
  const meta = TASK_STATUS[status] || { label: status, color: '#8a93a6' }
  return (
    <span className="status-pill" style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}14` }}>
      {meta.label}
    </span>
  )
}
