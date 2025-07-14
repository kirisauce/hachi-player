import { children, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import "./ContentPage.scss";
import { useApp } from "../Contexts";

interface SideBarProps {
    draggerWidth: number;
    minWidth: number;
    maxWidth: number;
    width: number;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onWidthUpdated?: (delta: number) => void;
}

function SideBar(props: SideBarProps): JSX.Element {
    const app = useApp();
    let dragPointerId: Number | undefined = undefined;

    const startDrag = (e: PointerEvent) => {
        props.onDragStart?.();

        dragPointerId = e.pointerId;
        e.stopImmediatePropagation();
        e.preventDefault();

        document.body.classList.add("--content-page-side-bar-drag-cursor");
    };

    const drag = (e: PointerEvent) => {
        if (dragPointerId === e.pointerId) {
            props.onWidthUpdated?.(e.movementX);
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    };

    const endDrag = (e: PointerEvent) => {
        if (dragPointerId === e.pointerId) {
            props.onDragEnd?.();

            dragPointerId = undefined;
            e.stopImmediatePropagation();
            e.preventDefault();

            document.body.classList.remove("--content-page-side-bar-drag-cursor");
        }
    };

    onMount(() => {
        document.addEventListener("pointermove", drag);
        document.addEventListener("pointerup", endDrag);
        document.addEventListener("pointercancel", endDrag);

        onCleanup(() => {
            document.removeEventListener("pointermove", drag);
            document.removeEventListener("pointerup", endDrag);
            document.removeEventListener("pointercancel", endDrag);
        });
    });

    return <div class="content-page-side-bar" style={{ "flex-basis": `${Math.min(Math.max(props.minWidth, props.width), props.maxWidth)}px` }}>
        <div
            class="content-page-side-bar-dragger --content-page-side-bar-drag-cursor"
            style={{ width: `${props.draggerWidth}px` }}
            onPointerDown={startDrag}
        />

        <Show when={app.sideBarSettings.withLogo}>
            <div class="content-page-side-bar-item content-page-side-bar-item-no-shadow">
                <img class="content-page-side-bar-logo" src="/src-tauri/icons/icon.png" />
                <a class="content-page-side-bar-logo-text">HachiPlayer</a>
            </div>
        </Show>

        <For each={app.sideBarSettings.items}>
            {(item) => {
                return <div
                    classList={{
                        "content-page-side-bar-item": true,
                        "content-page-side-bar-item-no-shadow": item().noShadow ?? false,
                    }}
                >{item().el}</div>;
            }}
        </For>
    </div>;
}

export interface ContentPageProps {
    children?: JSX.Element;
}

export function ContentPage(props: ContentPageProps): JSX.Element {
    const [width, setWidth] = createSignal(100);
    const [minWidth, setMinWidth] = createSignal(0);
    const [maxWidth, setMaxWidth] = createSignal(Number.parseFloat("+inf"));
    const adjustWidth = () => setWidth(width => Math.min(Math.max(minWidth(), width), maxWidth()));

    const resolvedChildren = children(() => props.children);

    let contentPage;

    onMount(() => {
        const updateWidthRestriction = (n: number) => {
            setMinWidth(n * 0.2);
            setMaxWidth(n * 0.35);
        };
        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length > 0) {
                updateWidthRestriction(entries[0].contentRect.width);
                adjustWidth();
            }
        });
        updateWidthRestriction((contentPage! as HTMLElement).getBoundingClientRect().width);
        resizeObserver.observe(contentPage!);

        onCleanup(() => resizeObserver.disconnect());
    });

    return <div class="content-page" ref={contentPage}>
        <SideBar
            draggerWidth={4}
            minWidth={minWidth()}
            maxWidth={maxWidth()}
            width={width()}
            onDragStart={() => adjustWidth()}
            onDragEnd={() => adjustWidth()}
            onWidthUpdated={delta => setWidth(width => width + delta)}
        />
        <div class="content-page-container">{resolvedChildren()}</div>
    </div>;
}