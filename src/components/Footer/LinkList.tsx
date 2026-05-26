import { FooterLink } from './constants';

interface LinkListProps {
  links: FooterLink[];
}

export function LinkList({ links }: LinkListProps) {
  return (
    <ul className="footer-link-list">
      {links.map((link) => (
        <li key={link.href + link.label}>
          <a className="footer-link" href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
