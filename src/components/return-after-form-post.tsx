import { Script } from "@/components/script";
import { $select } from "@/utils";

const REDIRECT_BACK_AFTER_POST_FIELD = "__loki_redirect_back_after_post";
const IGNORE_RETURN_ROUTE_SELECTOR = "[data-loki-ignore-return-route]";
const CLEAR_RETURN_ROUTE_SELECTOR = "[data-loki-clear-return-route]";

export const returnAfterFormPostStorage = {
    storageKey: "return-after-form-post",
    destinationStorageKey: "return-after-form-post-destination",
    pendingStorageKey: "return-after-form-post-pending",
};

export function $completeReturnAfterFormPost(
    fallbackUrl: string,
    storage: typeof returnAfterFormPostStorage,
) {
    // Some successful POSTs render client-side completion work at the form URL
    // instead of issuing a server redirect. The destination pair remains scoped
    // to that URL and can be consumed once the completion work has finished.
    const returnRoute = sessionStorage.getItem(storage.storageKey);
    const expectedDestination = sessionStorage.getItem(
        storage.destinationStorageKey,
    );
    const currentRoute = window.location.pathname + window.location.search;
    const destination =
        returnRoute && expectedDestination === currentRoute
            ? returnRoute
            : fallbackUrl;

    sessionStorage.removeItem(storage.storageKey);
    sessionStorage.removeItem(storage.destinationStorageKey);
    sessionStorage.removeItem(storage.pendingStorageKey);
    window.location.replace(destination);
}

function $returnAfterFormPost(config: {
    storageKey: string;
    destinationStorageKey: string;
    pendingStorageKey: string;
    formFieldName: string;
    ignoreReturnRouteSelector: string;
    clearReturnRouteSelector: string;
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

            // Always suppress the Chromium POST→redirect navigate in this
            // document. Without this, a save with no stored return route
            // records the form URL as the return route when the server
            // redirects to the list, so the next edit/save chain jumps back
            // to the previous edit page.
            isPostPending = true;

            // A direct page load (or ignored list with no earlier route) has
            // no return route to restore; keep the server's normal POST
            // destination.
            if (!sessionStorage.getItem(storageKey)) return;
            sessionStorage.setItem(pendingStorageKey, "true");
            return;
        }

        // The unsaved-changes guard may cancel this attempt. If the user later
        // confirms leaving, it clears the dirty state and retries navigation.
        if (document.documentElement.dataset.lokiFormDirty === "true") return;

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

        if ($select.elOrNull(config.clearReturnRouteSelector, HTMLElement)) {
            sessionStorage.removeItem(storageKey);
            sessionStorage.removeItem(destinationStorageKey);
            sessionStorage.removeItem(pendingStorageKey);
            return;
        }

        const ignoresReturnRoute = $select.elOrNull(
            config.ignoreReturnRouteSelector,
            HTMLElement,
        );
        if (!ignoresReturnRoute) {
            // Record every ordinary same-origin document navigation. The form's
            // marker decides later whether a POST consumes it.
            sessionStorage.setItem(storageKey, sourceRoute);
        } else if (!sessionStorage.getItem(storageKey)) {
            // An ignored page loaded directly has no earlier client-side route
            // to preserve, so it must not invent one when the user leaves.
            return;
        }

        // Ignored intermediary pages preserve the existing return route but
        // still advance the expected destination. This keeps the state scoped
        // to the next page and prevents its load from discarding the chain.
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
    return (
        <Script
            $deps={[$select]}
            $args={[
                {
                    ...returnAfterFormPostStorage,
                    formFieldName: REDIRECT_BACK_AFTER_POST_FIELD,
                    ignoreReturnRouteSelector: IGNORE_RETURN_ROUTE_SELECTOR,
                    clearReturnRouteSelector: CLEAR_RETURN_ROUTE_SELECTOR,
                },
            ]}
            $exec={$returnAfterFormPost}
        />
    );
}

/**
 * Opts a form into returning to the route from which it was opened after a
 * successful POST. Render this inside saveable create and edit forms. The
 * client removes the hidden marker from FormData before submission. A
 * validation response on the form route keeps the original return route for a
 * corrected resubmission.
 *
 * Do not use this for single-action, destructive, authentication,
 * import/export, or confirmation forms, or forms with an intentional canonical
 * destination. Browsers without the Navigation API use the server redirect.
 */
export function RedirectBackAfterPost() {
    return (
        <input
            type="hidden"
            name={REDIRECT_BACK_AFTER_POST_FIELD}
            value="true"
            data-loki-keep-enabled-on-submit={
                // HTML submits only "successful" controls; disabled controls
                // are not successful, so NavigateEvent.formData omits them.
                true
            }
        />
    );
}

/**
 * Makes an intermediary page transparent when recording a return route.
 * Navigating through a marked page preserves the earlier pathname and query
 * while advancing the expected destination. A directly loaded marked page
 * does not invent a return route.
 *
 * Use this on list pages that should be skipped when a form reached through
 * the list saves. Jump item list views use it to return past the list.
 */
export function IgnoreReturnRoute() {
    return <template data-loki-ignore-return-route></template>;
}

/** Clears stored return navigation when leaving a page for a form. */
export function ClearReturnRoute() {
    return <template data-loki-clear-return-route></template>;
}
