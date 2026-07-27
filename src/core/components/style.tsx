import { useAppContext } from "@/core/create-app";

/**
 * Tagged-template helper that concatenates CSS source for use with `Style`.
 * Passes through interpolations as strings; does not minify or transform CSS.
 */
export function css(
    strings: TemplateStringsArray,
    ...values: unknown[]
): string {
    return strings.reduce(
        (result, string, index) => result + string + (values[index] ?? ""),
        "",
    );
}

/**
 * Injects a `<style>` tag once per unique CSS string in the current render.
 * Deduplicates via the request-scoped `cssDupCache` so the same rules are not
 * emitted multiple times when a component is rendered more than once.
 *
 * @param props.children - CSS source string, or a function that receives `css`
 *   and returns a string (for tagged-template usage).
 */
export function Style(props: {
    children: ((css_: typeof css) => string) | string;
}) {
    const cssDupCache = useAppContext().cssDupCache;
    const cssString =
        typeof props.children === "string"
            ? props.children
            : props.children(css);
    if (cssDupCache.has(cssString)) return <></>;
    cssDupCache.add(cssString);
    return <style dangerouslySetInnerHTML={{ __html: cssString }} />;
}

Style.css = css;
