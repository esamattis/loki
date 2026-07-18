import { Script } from "@/components/script";

const REDIRECT_BACK_AFTER_POST_FIELD = "__loki_redirect_back_after_post";

function $returnAfterFormPost(config: {
    storageKey: string;
    destinationStorageKey: string;
    pendingStorageKey: string;
    formFieldName: string;
}) {
    const storageKey = config.storageKey;
    const destinationStorageKey = config.destinationStorageKey;
    const pendingStorageKey = config.pendingStorageKey;

    // These three values describe a navigation across document loads:
    // - returnRoute is the page the user left;
    // - expectedDestination is the page they deliberately opened;
    // - pendingStorageKey is armed only when that page submits an opted-in POST.
    // This script is the first body child, so it can consume that state before
    // the POST response's content is parsed and painted.
    const returnRoute = sessionStorage.getItem(storageKey);
    const expectedDestination = sessionStorage.getItem(destinationStorageKey);
    const currentRoute = window.location.pathname + window.location.search;
    if (returnRoute && sessionStorage.getItem(pendingStorageKey) === "true") {
        // Clear the one-shot flag first so a failed or interrupted redirect
        // cannot create a redirect loop on reload.
        sessionStorage.removeItem(pendingStorageKey);
        if (expectedDestination !== currentRoute) {
            // The POST left its form page, which indicates that the server
            // accepted it and redirected. Consume the stored pair before
            // replacing that server-selected destination with the return route.
            sessionStorage.removeItem(storageKey);
            sessionStorage.removeItem(destinationStorageKey);
            if (returnRoute !== currentRoute && "navigation" in window) {
                window.navigation.navigate(returnRoute, {
                    history: "replace",
                });
            }
            return;
        }
        // Remaining on the expected form route indicates a validation response.
        // Keep the return and destination routes so a corrected resubmission can
        // still return to the page that originally opened the form.
    } else if (expectedDestination && expectedDestination !== currentRoute) {
        // No opted-in POST is pending and this is not the page for which the
        // state was recorded. The user navigated elsewhere, so discard stale
        // state rather than applying it to an unrelated future submission.
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(destinationStorageKey);
        sessionStorage.removeItem(pendingStorageKey);
    }

    if (!("navigation" in window)) return;
    let isPostPending = false;
    window.navigation.addEventListener("navigate", (event) => {
        // Hash fragments are intentionally excluded: returning restores the
        // route and query that determine server-rendered content, not scroll
        // position within that content.
        const sourceRoute = window.location.pathname + window.location.search;
        if (event.formData) {
            // NavigateEvent.formData identifies a form POST. Only forms with the
            // hidden RedirectBackAfterPost marker opt into this behavior.
            if (!event.formData.has(config.formFieldName)) return;

            // The marker is client-only metadata. Removing it here prevents the
            // private implementation field from reaching route handlers.
            event.formData.delete(config.formFieldName);

            // A direct page load has no previous client-side route to restore;
            // in that case, preserve the server's normal POST destination.
            if (!sessionStorage.getItem(storageKey)) return;
            sessionStorage.setItem(pendingStorageKey, "true");
            isPostPending = true;
            return;
        }

        // Chromium may report the server redirect that follows a POST as
        // another navigation in the old document. Do not let that event replace
        // the return route while the marked POST is in flight.
        if (isPostPending) return;

        const destination = new URL(event.destination.url);
        if (
            destination.origin !== window.location.origin ||
            destination.pathname + destination.search === sourceRoute
        ) {
            return;
        }

        // Record every ordinary same-origin document navigation. The form's
        // marker decides later whether a POST consumes it; expectedDestination
        // scopes the value so unrelated page loads can recognize it as stale.
        sessionStorage.setItem(storageKey, sourceRoute);
        sessionStorage.setItem(
            destinationStorageKey,
            destination.pathname + destination.search,
        );
        sessionStorage.removeItem(pendingStorageKey);
    });
}

/**
 * Returns to the route that opened a form page after that page posts a form.
 * The Navigation API stores the current pathname and query string when moving
 * to another same-origin page. A POST containing the private marker rendered
 * by `RedirectBackAfterPost` removes that marker from its form data and marks
 * the route as pending. The next rendered page clears the stored state before
 * replacing its URL with the saved route. Unrelated navigation discards stale
 * state. The behavior is disabled when the browser does not support the
 * Navigation API.
 *
 * Example:
 * - The user follows `/preferences` from `/logbook?search=wingsuit`.
 * - The preferences form contains `<RedirectBackAfterPost />`.
 * - Submitting a POST on `/preferences` marks the logbook route as pending.
 * - The POST response loads, then the browser returns to the filtered logbook.
 */
export function ReturnAfterFormPost() {
    const storageKey = "return-after-form-post";
    const destinationStorageKey = "return-after-form-post-destination";
    const pendingStorageKey = "return-after-form-post-pending";
    return (
        <Script
            $args={[
                {
                    storageKey,
                    destinationStorageKey,
                    pendingStorageKey,
                    formFieldName: REDIRECT_BACK_AFTER_POST_FIELD,
                },
            ]}
            $exec={$returnAfterFormPost}
        />
    );
}

export function RedirectBackAfterPost() {
    // Form submit progress disables controls asynchronously. This field must
    // stay enabled so NavigateEvent.formData still contains it.
    return (
        <input
            type="hidden"
            name={REDIRECT_BACK_AFTER_POST_FIELD}
            value="true"
            data-loki-keep-enabled-on-submit
        />
    );
}
