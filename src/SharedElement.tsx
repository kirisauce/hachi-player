import { Accessor, children, createEffect, createMemo, createSignal, JSX, mergeProps, onCleanup, onMount, untrack } from "solid-js";
import "./SharedElement.scss";
import { Easings, isElement } from "./Util";

export interface AnimationSettings extends KeyframeEffectOptions {
    enable?: boolean;
}

/**
 * The elements involved in a transition.
 * `group` is the root container for all elements involved in the transition.
 * `pair` is the container for the old and new elements.
 * The elements are organized as follows, looks like what the 
 * [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) does:
 * ```
 * group
 * ├── pair
 * │   ├── old
 * │   └── new
 * ```
 * 
 * It is noticable that in some cases, `old` or `new` may be undefined.
 * For example, when the transition is from a non-existing element to an existing element,
 * `old` will be undefined.
 */
export interface TransitionElements {
    old?: HTMLElement;
    new?: HTMLElement;
    group: HTMLElement;
    pair: HTMLElement;
}

/**
 * The state of a single shared element.
 */
export interface ElementState {
    el: HTMLElement;
    transformAnimation: AnimationSettings;
    fadeOutAnimation: AnimationSettings;
    fadeInAnimation: AnimationSettings;
    onAnimationsReady?: (elements: TransitionElements) => void;
    onAnimationsEnd?: (elements: TransitionElements) => void;
}

export interface GroupState {
    elOld?: ElementState;
    rectOld?: DOMRect;
    elements: Accessor<ElementState>[];
}

/**
 * Stores the shared elements and their states.
 */
export const globalState: {
    /**
     * Tracks all shared elements' state.
     * The key is the shared element's `name` attribute.
     */
    groups: Map<string, GroupState>,

    /**
     * Whether there is a transition in progress.
     * This field is set to true during function call of {@link startTransition}.
     */
    isTransitioning: boolean,

    /**
     * The root element of all transitioning elements.
     */
    transitionRoot: HTMLElement,

    previousTransitionFinished: Promise<void>;
} = {
    groups: new Map(),
    isTransitioning: false,
    transitionRoot: (() => {
        const el = document.createElement("div");
        el.id = "shared-element-transition-root";
        document.body.appendChild(el);
        return el;
    })(),
    previousTransitionFinished: Promise.resolve(),
};

/**
 * Saves the old state of shared elements and their bounding rectangles before a transition.
 * Iterates through all groups of shared elements and saves the old element and its animation settings
 * if there is exactly one element in the group.
 */
function saveElementsAndBoundingRects() {
    globalState.groups.forEach((group) => {
        if (group.elements.length == 1) {
            group.elOld = {
                el: group.elements[0]().el.cloneNode(true) as HTMLElement,
                transformAnimation: group.elements[0]().transformAnimation,
                fadeOutAnimation: group.elements[0]().fadeOutAnimation,
                fadeInAnimation: group.elements[0]().fadeInAnimation,
            };
            // Hide the nested elements by checking the marker class
            group.elOld!.el.querySelectorAll(".--se-transition-internal-marker").forEach(elNested => {
                elNested.classList.remove("--se-transition-internal-marker");
                elNested.classList.add("--se-transition-internal-hidden");
            });
            // Why not use `group.elOld!.el`?
            // It is a copied element, and is not contained in the DOM tree.
            // So `getBoundingClientRect()` will get wrong rectangle.
            group.rectOld = group.elements[0]().el.getBoundingClientRect();
        }
    });
}

function clearSavedElementsAndBoundingRects() {
    globalState.groups.forEach((group) => {
        group.elOld = undefined;
        group.rectOld = undefined;
    });
}

export type SharedElementProps = {
    /**
     * A unique name for the shared element.
     * This name is used to group shared elements together during transitions.
     * Elements with the same name will be considered part of the same transition group.
     */
    name: string;

    /**
     * The child element that will be treated as a shared element.
     * It must be a single element; otherwise, a TypeError will be thrown.
     */
    children: JSX.Element;

    transformAnimationProps?: AnimationSettings;
    fadeOutAnimationProps?: AnimationSettings;
    fadeInAnimationProps?: AnimationSettings;

    /**
     * A callback function that is invoked when all animations are ready to start.
     * It receives an object containing the old, new, group, and pair elements involved in the transition.
     */
    onAnimationReady?: (elements: TransitionElements) => void;

    /**
     * A callback function that is invoked when all animations have ended, including the user-defined animations.
     * It receives an object containing the old, new, group, and pair elements involved in the transition.
     */
    onAnimationEnd?: (elements: TransitionElements) => void;
};

const SharedElementDefaultProps = {
    transformAnimationProps: {
        enable: true,
    },
    fadeOutAnimationProps: {
        enable: true,
    },
    fadeInAnimationProps: {
        enable: true,
    },
};

export function SharedElement(rawProps: SharedElementProps): JSX.Element {
    const props = mergeProps(SharedElementDefaultProps, rawProps);
    let oldName: string = untrack(() => props.name);

    const jsxChild = children(() => props.children);
    if (!isElement(jsxChild())) {
        throw new TypeError("SharedElement's children must be a single element.");
    }
    const child = createMemo(() => jsxChild() as HTMLElement);
    child().classList.add("--se-transition-internal-marker");

    const [elementState, setElementState] = createSignal<ElementState>({
        el: child(),
        transformAnimation: props.transformAnimationProps,
        fadeOutAnimation: props.fadeOutAnimationProps,
        fadeInAnimation: props.fadeInAnimationProps,
        onAnimationsReady: props.onAnimationReady,
        onAnimationsEnd: props.onAnimationEnd,
    });
    createEffect(() => {
        setElementState({
            el: child(),
            transformAnimation: props.transformAnimationProps,
            fadeOutAnimation: props.fadeOutAnimationProps,
            fadeInAnimation: props.fadeInAnimationProps,
            onAnimationsReady: props.onAnimationReady,
            onAnimationsEnd: props.onAnimationEnd,
        });
    });

    const mountAction = (name: string) => {
        if (globalState.groups.has(name)) {
            globalState.groups.get(name)!.elements.push(elementState);
        } else {
            const elements: Accessor<ElementState>[] = [elementState];
            globalState.groups.set(name, {
                elements,
            });
        }
    };
    onMount(() => mountAction(props.name));

    const cleanupAction = (name: string) => {
        const group = globalState.groups.get(name);
        if (group) {
            // If exists, remove the element from the list.
            const idx = group.elements.findIndex(val => untrack(() => val().el === child()));
            if (idx >= 0) {
                group.elements.splice(idx, 1);
            }

            // Delete the unnecessary list to prevent memory leak.
            if (!(globalState.isTransitioning || group.elements.length)) {
                globalState.groups.delete(name);
            }
        }
    };
    onCleanup(() => cleanupAction(props.name));

    createEffect(() => {
        if (props.name !== oldName) {
            cleanupAction(oldName);
            mountAction(props.name);
            oldName = props.name;
        }
    });

    return child();
}

export function startTransitionSE(callback: () => void, allowDefer: boolean = true) {
    if (globalState.isTransitioning) {
        if (allowDefer) {
            globalState.previousTransitionFinished.finally(() => performTransition(callback));
        } else {
            console.error("Previous shared element transition has not finished yet.");
        }
    } else {
        performTransition(callback);
    }
}

function performTransition(callback: () => void) {
    globalState.isTransitioning = true;

    let markFinished;
    globalState.previousTransitionFinished = new Promise<void>((resolve) => {
        markFinished = resolve;
    });

    // Save all old elements' bounding rectangle.
    saveElementsAndBoundingRects();

    // Wait shared element to be changed.
    callback();

    // Perform transition animation on changed elements.
    for (const [name, group] of globalState.groups) {
        if (group.elements.length > 1) {
            console.error(`Shared element group '${name}' contains multiple elements(${group.elements.length}). No transition animation will be performed.`)
        } else if (group.elements.length == 1) {
            const elStateNew = group.elements[0]();

            // Set style for old and new element.
            const elOld = group.elOld?.el;

            const elNew = elStateNew.el.cloneNode(true) as HTMLElement;
            const rectNew = elStateNew.el.getBoundingClientRect();
            elNew.classList.add("se-transition-element-new");
            elNew.classList.add(`se-transition-element-new-${name}`);
            elNew.style.width = `${rectNew.width}px`;
            elNew.style.height = `${rectNew.height}px`;
            elNew.style.transformOrigin = "top left";
            elNew.style.opacity = "0";

            // elOld may be non-existing
            if (elOld) {
                elOld.classList.add("se-transition-element-old");
                elOld.classList.add(`se-transition-element-old-${name}`);
                elOld.style.width = `${group.rectOld!.width}px`;
                elOld.style.height = `${group.rectOld!.height}px`;
                elOld.style.opacity = "1";
                elNew.style.transform = `matrix(${group.rectOld!.width / rectNew.width}, 0, 0, ${group.rectOld!.height / rectNew.height}, 0, 0)`;
            }

            // Put the old element and the new element into transition group element.
            const elGroup = document.createElement("div");
            const initialRect = group.rectOld ?? rectNew;
            elGroup.classList.add("se-transition-group");
            elGroup.classList.add(`se-transition-group-${name}`);
            elGroup.style.width = `${initialRect.width}px`;
            elGroup.style.height = `${initialRect.height}px`;
            elGroup.style.transform = `matrix(1, 0, 0, 1, ${initialRect.x}, ${initialRect.y})`;

            const elPair = document.createElement("div");
            elPair.classList.add("se-transition-element-pair");
            elPair.classList.add(`se-transition-element-pair-${name}`);
            if (elOld)
                elPair.appendChild(elOld);
            elPair.appendChild(elNew);

            elGroup.appendChild(elPair);

            // const elGroup = (
            //     <div
            //         class={/*@once*/ `se-transition-group se-transition-group-${name}`}
            //         style={/*@once*/ elementPairStyle}
            //         ref={/*@once*/ performAnimation}
            //     >
            //         <div class={/*@once*/ `se-transition-element-pair se-transition-element-pair-${name}`}>
            //             {/*@once*/ elOld}
            //             {/*@once*/ elNew}
            //         </div>
            //     </div>
            // ) as HTMLElement;

            globalState.transitionRoot.appendChild(elGroup);

            // Hide the new element.
            elStateNew.el.classList.add("--se-transition-internal-hidden");

            // Perform the transition animation
            if ((elStateNew.transformAnimation.enable ?? true) && elOld) {
                const anim = elGroup.animate([{
                    // width: `${rectNew.width}px`,
                    // height: `${rectNew.height}px`,
                    transform: `matrix(${rectNew.width / group.rectOld!.width}, 0, 0, ${rectNew.height / group.rectOld!.height}, ${rectNew.x}, ${rectNew.y})`,
                }], mergeProps({
                    duration: 300,
                    easing: Easings.MotionDefault(),
                }, elStateNew.transformAnimation));

                anim.finished.then(() => {
                    elGroup.remove();
                });
            }

            if (elStateNew.fadeInAnimation.enable ?? true) {
                elNew.animate([{
                    opacity: 1,
                }], mergeProps({
                    duration: 300,
                }, elStateNew.fadeInAnimation));
            }

            if ((elStateNew.fadeOutAnimation.enable ?? true) && elOld) {
                elOld.animate([{
                    opacity: 0,
                }], mergeProps({
                    duration: 300,
                }, elStateNew.fadeOutAnimation));
            }

            const transitionElements = {
                group: elGroup,
                pair: elPair,
                old: elOld,
                new: elNew,
            };

            elStateNew.onAnimationsReady?.(transitionElements);

            const animations = elGroup.getAnimations({ subtree: true });
            Promise.all(animations.map(anim => anim.finished)).finally(() => {
                elStateNew.el.classList.remove("--se-transition-internal-hidden");
                elStateNew.onAnimationsEnd?.(transitionElements);
                elGroup.remove();

                markFinished!();
            });
        } else {
            const elStateOld = group.elOld!;
            const elOld = elStateOld.el;
            elOld.classList.add("se-transition-element-old");
            elOld.classList.add(`se-transition-element-old-${name}`);
            elOld.style.width = `${group.rectOld!.width}px`;
            elOld.style.height = `${group.rectOld!.height}px`;
            elOld.style.opacity = "1";

            // Put the old element and the new element into transition group element.
            const elGroup = document.createElement("div");
            elGroup.classList.add("se-transition-group");
            elGroup.classList.add(`se-transition-group-${name}`);
            elGroup.style.width = `${group.rectOld!.width}px`;
            elGroup.style.height = `${group.rectOld!.height}px`;
            elGroup.style.transform = `matrix(1, 0, 0, 1, ${group.rectOld!.x}, ${group.rectOld!.y})`;

            const elPair = document.createElement("div");
            elPair.classList.add("se-transition-element-pair");
            elPair.classList.add(`se-transition-element-pair-${name}`);
            elPair.appendChild(elOld);

            elGroup.appendChild(elPair);

            globalState.transitionRoot.appendChild(elGroup);

            if ((elStateOld.fadeOutAnimation.enable ?? true) && elOld) {
                elOld.animate([{
                    opacity: 0,
                }], mergeProps({
                    duration: 300,
                }, elStateOld.fadeOutAnimation));
            }

            const transitionElements = {
                group: elGroup,
                pair: elPair,
                old: elOld,
            };

            elStateOld.onAnimationsReady?.(transitionElements);

            const animations = elGroup.getAnimations({ subtree: true });
            Promise.all(animations.map(anim => anim.finished)).finally(() => {
                elStateOld.onAnimationsEnd?.(transitionElements);
                elGroup.remove();

                markFinished!();
            });
        }
    }
    globalState.isTransitioning = false;

    clearSavedElementsAndBoundingRects();
}