/**
 * Utility function to conditionally join class names together
 */
export function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
