declare module "katex/contrib/auto-render" {
  interface Delimiter { left: string; right: string; display: boolean; }
  interface Options { delimiters?: Delimiter[]; throwOnError?: boolean; }
  function renderMathInElement(element: Element, options?: Options): void;
  export default renderMathInElement;
}
