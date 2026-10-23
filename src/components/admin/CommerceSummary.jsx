import { Link } from 'react-router'
import useNow from '../../hooks/useNow'
import { commerceSnapshot, orderNeedsReview } from '../../lib/commerceSelectors'
import { money } from '../../data/bookingCatalog'
import { customerName } from '../../lib/adminSelectors'
import DashboardPanel from './DashboardPanel'
import { TransactionList } from './CommerceControls'
export default function CommerceSummary({ data }) {
  const clock = useNow()
  const summary = commerceSnapshot(data, clock)
  const review = summary.pendingOrders.filter((order) => orderNeedsReview(order, data.bookings))
  return <section className="ops-commerce-summary"><div className="ops-management-toolbar"><h2>Orders &amp; cash desk</h2><Link className="ops-text-link" to="/admin/analytics">Open analytics</Link></div>{review.length > 0 && <p className="form-error" role="status">{review.length} undelivered food order(s) belong to cancelled bookings. <Link to="/admin/orders">Review and cancel explicitly</Link>.</p>}<div className="ops-stat-grid">{[['Outstanding / active bookings', money(summary.outstanding)], ['Unpaid or partial bookings', summary.unpaid.length], ['Food orders awaiting fulfillment', summary.pendingOrders.length], ["Today's refunds", money(summary.refundsToday)]].map(([label, value]) => <article className="ops-stat" key={label}><div className="ops-stat-top">{label}</div><strong>{value}</strong></article>)}</div><div className="ops-resource-grid"><DashboardPanel title="Unpaid & partially paid" action={<Link className="ops-text-link" to="/admin/payments">Open mock ledger</Link>}>{summary.unpaid.length ? <ul className="ops-commerce-list">{summary.unpaid.slice(0, 5).map((item) => <li key={item.booking.id}><Link className="ops-text-link" to={`/admin/bookings/${item.booking.id}`}>{item.booking.stationId.toUpperCase()} / {customerName(item.booking)}</Link><strong>{money(item.outstanding)}</strong></li>)}</ul> : <p className="ops-muted">No outstanding saved reservations.</p>}</DashboardPanel><DashboardPanel title="Recent mock transactions"><TransactionList transactions={data.transactions.slice(-5)} /></DashboardPanel></div></section>
}
