import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode, type TableHTMLAttributes } from 'react';

type ElementProps = { children?: ReactNode; colSpan?: number; rowSpan?: number; 'data-label'?: string; 'data-wide'?: boolean };
const text = (node: ReactNode): string => Children.toArray(node).map(child =>
  isValidElement<ElementProps>(child) ? text(child.props.children) : typeof child === 'string' || typeof child === 'number' ? String(child) : '',
).join(' ').replace(/\s+/g, ' ').trim();

/** A real table on desktop; labelled records on phones. Labels come from its own headings. */
export function ResponsiveTable({ children, className = '', ...props }: TableHTMLAttributes<HTMLTableElement>) {
  const sections = Children.toArray(children);
  const head = sections.find(node => isValidElement(node) && node.type === 'thead') as ReactElement<ElementProps> | undefined;
  const headingRow = head && Children.toArray(head.props.children).find(node => isValidElement(node) && node.type === 'tr') as ReactElement<ElementProps> | undefined;
  const labels = headingRow ? Children.toArray(headingRow.props.children).map(text) : [];
  const records = sections.map(section => {
    if (!isValidElement<ElementProps>(section) || section.type !== 'tbody') return section;
    return cloneElement(section, {}, Children.map(section.props.children, row => {
      if (!isValidElement<ElementProps>(row) || row.type !== 'tr') return row;
      let column = 0;
      return cloneElement(row, {}, Children.map(row.props.children, cell => {
        if (!isValidElement<ElementProps>(cell) || !['td', 'th'].includes(String(cell.type))) return cell;
        const label = labels[column] || 'Actions';
        column += cell.props.colSpan || 1;
        return cloneElement(cell, { 'data-label': label, 'data-wide': Boolean(cell.props.colSpan && cell.props.colSpan > 1) });
      }));
    }));
  });
  return <table {...props} className={`responsive-records ${className}`}>{records}</table>;
}
