import { useAppContext } from "@/app/app";

export function css(
    strings: TemplateStringsArray,
    ...values: unknown[]
): string {
    return strings.reduce(
        (result, string, index) => result + string + (values[index] ?? ""),
        "",
    );
}

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
