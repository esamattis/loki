

This is a Hono.js project using JSX. Using only server side rendering (SSR) with Hono.js and JSX.

Never destructure the `prop` parameter on the component functions. Eg. alway refer props via `props.propName`.

Use tailwindcss for styling. When using conditional classes, use the `clsx` package to combine classes.

If you need vanilla use the Css component helper:

```tsx
<Style>
  .my-class {
    color: red;
  }
</Style>
```


Also if you need client-side javascript, use the `Script` component helper:

```tsx
<Script $exec={() => {
  // Your client-side JavaScript code here
}} />
```


These components are imported from project the helpers.tx file.

When referencing an element in the Script component, use `useId()` hook from
"hono/jsx" to generate unique ID for the element and use it in the `Script`
component via the `$args` prop. like this:

```tsx
const id = useId();
return (
    <div>
        <button id={id} >example</button>
        <Script
            $args={[id]}
            $exec={(id) => {
                const button = document.getElementById(id);
                $assertElement(button, HTMLButtonElement);
                // ..rest of the code
            }}
        />
    </div>
);
```

Always use the $assertElement(el, typeclass) to assert the elements. Defined in the utils.tsx.


Write named functions using the `function` keyword. Use arrow functions only for anonymous functions. Callbacks etc.

All functions starting with dollar sign `$` are and should be designed so they can be executed in the browser.


Always write user interface text in English language.

## Tests

Always after every change run

```
pn test
```

## Route Helpers

Use the route helper functions from routes.tsx for type-safe routing. Follow these patterns:

### Defining Routes
Define routes using the `route()` function in routes.tsx:
```tsx
export const userView = route("/user/:username");
export const userManage = route("/user/:username/manage");
```

### Generating URLs
Use the route helper's function call to generate URLs with parameters:
```tsx
// Generate URL with parameters
const url = userView({ username: "john" });
// Results in: "/user/john"

// In JSX for links
<a href={userView({ username: user.username })}>View User</a>

// For redirects
return c.redirect(userView({ username }));
```

### Registering Route Handlers
Use the `.route` property to register handlers:
```tsx
app.get(userView.route, async (c) => {
    // Handler logic
});
```

### Extracting Route Parameters
Use the `.params()` method to extract parameters in handlers:
```tsx
app.get(userView.route, async (c) => {
    const { username } = userView.params(c);
    // username is now type-safe and decoded
});
```

Never hardcode URLs - always use the route helpers for internal navigation.
