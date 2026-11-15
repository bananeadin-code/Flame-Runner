import { href } from "../lib/route";

export function Link({ to, query, className = "", children, ...props }) {
  return (
    <a href={href(to, query)} className={className} {...props}>
      {children}
    </a>
  );
}
