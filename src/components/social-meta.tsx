const SITE_NAME = "Loki - Skydiving Logbook";
const DESCRIPTION =
    "Open source digital skydiving logbook. Self-host, run locally, or use the invite-only hosted version. Your jumps, your gear, your data.";
const IMAGE_PATH = "/og-image.png";
const IMAGE_WIDTH = "1200";
const IMAGE_HEIGHT = "630";
const IMAGE_TYPE = "image/png";
const IMAGE_ALT = "Loki – Open source skydiving logbook";

export function SocialMeta(props: { title: string; url: URL }) {
    const pageUrl = `${props.url.origin}${props.url.pathname}`;
    const imageUrl = `${props.url.origin}${IMAGE_PATH}`;

    return (
        <>
            <meta name="description" content={DESCRIPTION} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={props.title} />
            <meta property="og:description" content={DESCRIPTION} />
            <meta property="og:url" content={pageUrl} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:image:type" content={IMAGE_TYPE} />
            <meta property="og:image:width" content={IMAGE_WIDTH} />
            <meta property="og:image:height" content={IMAGE_HEIGHT} />
            <meta property="og:image:alt" content={IMAGE_ALT} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={props.title} />
            <meta name="twitter:description" content={DESCRIPTION} />
            <meta name="twitter:image" content={imageUrl} />
            <meta name="twitter:image:alt" content={IMAGE_ALT} />
        </>
    );
}
