import { Link } from 'react-router'

export default function Button({ to, children, variant = 'primary', ...props }) {
  if (!to) return <button type="button" className={`button button-${variant}`} {...props}>{children}</button>
  if (to.includes('#')) {
    return <a href={to} className={`button button-${variant}`} {...props}>{children}</a>
  }
  return <Link to={to} className={`button button-${variant}`} {...props}>{children}</Link>
}
