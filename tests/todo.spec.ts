import { expect, test } from "./fixtures";

test("manages todos without losing the new task input", async ({ page }) => {
    await page.goto("/todo");

    await expect(
        page.getByRole("heading", { name: "Todo list" }),
    ).toBeVisible();
    await expect(page.getByText("No tasks yet.")).toBeVisible();

    const input = page.getByRole("textbox", { name: "New task" });
    await input.fill("Buy milk");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("1 task remaining")).toBeVisible();

    await input.fill("Draft survives rerender");
    await page.getByRole("checkbox", { name: "Buy milk" }).check();
    await expect(input).toHaveValue("Draft survives rerender");
    await expect(page.getByText("0 tasks remaining")).toBeVisible();

    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("1 task remaining")).toBeVisible();
    await page.getByRole("button", { name: "Delete Buy milk" }).click();
    await expect(page.getByText("Buy milk")).toHaveCount(0);
    await expect(page.getByText("Draft survives rerender")).toBeVisible();
});

test("render template validates before replacing slots", async ({ page }) => {
    await page.goto("/todo");

    const result = await page.evaluate(() => {
        const renderTemplateKey = Object.keys(window).find((key) =>
            key.startsWith("__$renderTemplate_"),
        );
        const renderTemplate = renderTemplateKey
            ? Reflect.get(window, renderTemplateKey)
            : undefined;
        if (typeof renderTemplate !== "function") {
            throw new Error("Render template function not found");
        }

        const rootTemplate = document.createElement("template");
        rootTemplate.id = "root-slot-template";
        rootTemplate.innerHTML = '<p data-template-slot="text"></p>';
        document.body.appendChild(rootTemplate);
        const rootContainer = document.createElement("div");
        renderTemplate(rootContainer, rootTemplate.id, { text: "first" });
        const firstRoot = rootContainer.firstElementChild;
        renderTemplate(rootContainer, rootTemplate.id, { text: "second" });

        const stableTemplate = document.createElement("template");
        stableTemplate.id = "stable-template";
        stableTemplate.innerHTML =
            '<div><span data-template-slot="first"></span><span data-template-slot="second"></span></div>';
        document.body.appendChild(stableTemplate);
        const stableContainer = document.createElement("div");
        renderTemplate(stableContainer, stableTemplate.id, {
            first: "old first",
            second: "old second",
        });
        let missingValueError = "";
        try {
            renderTemplate(stableContainer, stableTemplate.id, {
                first: "new first",
            });
        } catch (error) {
            missingValueError = String(error);
        }

        const invalidTemplate = document.createElement("template");
        invalidTemplate.id = "invalid-root-template";
        invalidTemplate.innerHTML =
            '<div data-template-slot="value"></div><div></div>';
        document.body.appendChild(invalidTemplate);
        const source = document.createElement("div");
        const suppliedNode = document.createElement("span");
        source.appendChild(suppliedNode);
        let invalidRootError = "";
        try {
            renderTemplate(document.createElement("div"), invalidTemplate.id, {
                value: suppliedNode,
            });
        } catch (error) {
            invalidRootError = String(error);
        }

        const nestedTemplate = document.createElement("template");
        nestedTemplate.id = "nested-slot-template";
        nestedTemplate.innerHTML =
            '<div><span data-template-slot="outer"><i data-template-slot="inner"></i></span></div>';
        document.body.appendChild(nestedTemplate);
        let nestedSlotError = "";
        try {
            renderTemplate(document.createElement("div"), nestedTemplate.id, {
                outer: "outer",
                inner: "inner",
            });
        } catch (error) {
            nestedSlotError = String(error);
        }

        return {
            rootIsStable: rootContainer.firstElementChild === firstRoot,
            rootText: rootContainer.textContent,
            stableText: stableContainer.textContent,
            missingValueError,
            suppliedNodeStayedPut: source.firstElementChild === suppliedNode,
            invalidRootError,
            nestedSlotError,
        };
    });

    expect(result).toEqual({
        rootIsStable: true,
        rootText: "second",
        stableText: "old firstold second",
        missingValueError: "Error: Missing template value: second",
        suppliedNodeStayedPut: true,
        invalidRootError:
            "Error: Template must have one HTML root: invalid-root-template",
        nestedSlotError: "Error: Nested template slot: inner",
    });
});
