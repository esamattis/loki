import { useAppContext } from "@/core/create-app";
const IMAGE_WIDTH = "1200";
const IMAGE_HEIGHT = "630";
const IMAGE_TYPE = "image/png";

export function SocialMeta(props: { title: string; url: URL }) {
    const pageUrl = `${props.url.origin}${props.url.pathname}`;
    const options = useAppContext().appOptions;
    const imageUrl = `${props.url.origin}${options.socialImagePath}`;

    return (
        <>
            <meta name="description" content={options.description} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={options.title} />
            <meta property="og:title" content={props.title} />
            <meta property="og:description" content={options.description} />
            <meta property="og:url" content={pageUrl} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:image:type" content={IMAGE_TYPE} />
            <meta property="og:image:width" content={IMAGE_WIDTH} />
            <meta property="og:image:height" content={IMAGE_HEIGHT} />
            <meta property="og:image:alt" content={options.socialImageAlt} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={props.title} />
            <meta name="twitter:description" content={options.description} />
            <meta name="twitter:image" content={imageUrl} />
            <meta name="twitter:image:alt" content={options.socialImageAlt} />
        </>
    );
}
