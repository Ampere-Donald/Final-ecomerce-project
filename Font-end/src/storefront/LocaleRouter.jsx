/* eslint-disable react-refresh/only-export-components */
import { Link as RouterLink, NavLink as RouterNavLink, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { hasEnglishRoute } from './localeRoutes.js';
import { useCallback } from 'react';
export * from 'react-router-dom';
const destinationPath = to => typeof to === 'string' ? to.split(/[?#]/)[0] : to?.pathname;
const frenchOnly = (to, lang) => lang === 'en' && destinationPath(to)?.startsWith('/') && !hasEnglishRoute(destinationPath(to));
const href = to => typeof to === 'string' ? to : (to.pathname || '') + (to.search || '') + (to.hash || '');
// Basename retains English navigation; French-only records use their real URL.
export function Link({ to, ...props }) {
  const { lang } = useI18n();
  return frenchOnly(to, lang) ? <a {...props} href={href(to)} /> : <RouterLink {...props} to={to} />;
}
export function NavLink({ to, ...props }) {
  const { lang } = useI18n();
  return frenchOnly(to, lang) ? <a {...props} className={typeof props.className === 'function' ? props.className({ isActive: false, isPending: false }) : props.className} href={href(to)} /> : <RouterNavLink {...props} to={to} />;
}
export function useNavigate() {
  const navigate = useRouterNavigate();
  const { lang } = useI18n();
  return useCallback((to, options) => frenchOnly(to, lang) ? window.location.assign(href(to)) : navigate(to, options), [navigate, lang]);
}
