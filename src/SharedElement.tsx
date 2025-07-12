import { Accessor, children, createEffect, createMemo, createSignal, JSX, mergeProps, onCleanup, onMount, untrack } from "solid-js";
import "./SharedElement.scss";
import { Easings, isElement } from "./Util";

export interface AnimationSettings extends KeyframeEffectOptions {
    enable?: boolean;
}

export type ElementRole = "in" | "out";

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
export interface TransitionCallbackState {
    elOld?: HTMLElement;
    elNew?: HTMLElement;
    elGroup: HTMLElement;
    elPair: HTMLElement;

    role: ElementRole;
    isSingle: boolean;
}

/**
 * The state of a single shared element.
 */
export interface ElementState {
    el: HTMLElement;
    fadeOutAnimation: AnimationSettings & { initialOpacity?: string };
    fadeInAnimation: AnimationSettings & { initialOpacity?: string };
    onAnimationsReady?: (elements: TransitionCallbackState) => void;
    onAnimationsEnd?: (elements: TransitionCallbackState) => void;
    dependencies: string[];
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

    transformProperties: Map<string, AnimationSettings>,

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
    allowDefer: boolean,

    /**
     * Whether to silently fail if the transition fails.
     */
    silentlyFail: boolean,

    maxDependencyDepth: number,
} = {
    groups: new Map(),
    transformProperties: new Map(),
    isTransitioning: false,
    transitionRoot: (() => {
        const el = document.createElement("div");
        el.id = "shared-element-transition-root";
        document.body.appendChild(el);
        return el;
    })(),
    previousTransitionFinished: Promise.resolve(),
    allowDefer: false,
    silentlyFail: false,
    maxDependencyDepth: 100,
};

function cloneElementForTransition(el: HTMLElement): HTMLElement {
    const elNew = el.cloneNode(true) as HTMLElement;
    elNew.querySelectorAll(".--se-transition-internal-marker").forEach(elNested => {
        elNested.classList.remove("--se-transition-internal-marker");
        elNested.classList.add("--se-transition-internal-hidden");
    });
    return elNew;
}

/**
 * Saves the old state of shared elements and their bounding rectangles before a transition.
 * Iterates through all groups of shared elements and saves the old element and its animation settings
 * if there is exactly one element in the group.
 */
function saveElementsAndBoundingRects() {
    globalState.groups.forEach((group) => {
        if (group.elements.length == 1) {
            // Hide the nested elements by checking the marker class
            const state = group.elements[0]();
            const el = cloneElementForTransition(state.el);
            group.elOld = {
                el,
                fadeOutAnimation: state.fadeOutAnimation,
                fadeInAnimation: state.fadeInAnimation,
                onAnimationsReady: state.onAnimationsReady,
                onAnimationsEnd: state.onAnimationsEnd,
                dependencies: state.dependencies,
            };
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

    fadeOutAnimationProps?: AnimationSettings & { initialOpacity?: string };
    fadeInAnimationProps?: AnimationSettings & { initialOpacity?: string };

    /**
     * A callback function that is invoked when all animations are ready to start.
     * It receives an object containing the old, new, group, and pair elements involved in the transition.
     */
    onAnimationsReady?: (elements: TransitionCallbackState) => void;

    /**
     * A callback function that is invoked when all animations have ended, including the user-defined animations.
     * It receives an object containing the old, new, group, and pair elements involved in the transition.
     */
    onAnimationsEnd?: (elements: TransitionCallbackState) => void;

    dependencies?: string[];
};

const SharedElementDefaultProps = {
    fadeOutAnimationProps: {
        enable: true,
    },
    fadeInAnimationProps: {
        enable: true,
    },
    dependencies: [],
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
        fadeOutAnimation: props.fadeOutAnimationProps,
        fadeInAnimation: props.fadeInAnimationProps,
        onAnimationsReady: props.onAnimationsReady,
        onAnimationsEnd: props.onAnimationsEnd,
        dependencies: props.dependencies,
    });
    createEffect(() => {
        setElementState({
            el: child(),
            fadeOutAnimation: props.fadeOutAnimationProps,
            fadeInAnimation: props.fadeInAnimationProps,
            onAnimationsReady: props.onAnimationsReady,
            onAnimationsEnd: props.onAnimationsEnd,
            dependencies: props.dependencies,
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

export function setTransformProperty(groupName: string, props: JSX.FunctionMaybe<AnimationSettings>) {
    const resolvedProps = typeof props == "function" ? props() : props;
    globalState.transformProperties.set(groupName, resolvedProps);
}

export function getTransformProperty(groupName: string): AnimationSettings | undefined {
    return globalState.transformProperties.get(groupName);
}

export function startTransitionSE(callback: () => void, allowDefer_?: boolean) {
    const allowDefer = allowDefer_ ?? globalState.allowDefer;
    if (globalState.isTransitioning) {
        if (allowDefer) {
            globalState.previousTransitionFinished.finally(() => performTransition(callback));
        } else if (!globalState.silentlyFail) {
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

    const animationPromiseList = new Array<Promise<any>>();
    const groupsReady = new Array<string>();

    let allReady = false, dependencyDepth = 1;
    while (!allReady) {
        if (dependencyDepth > globalState.maxDependencyDepth)  {
            if (!globalState.silentlyFail) {
                console.error(`Dependency depth exceeded the limitation ${globalState.maxDependencyDepth}`);
            }
            break;
        }
        allReady = performTransitionGroups(animationPromiseList, groupsReady);
        dependencyDepth += 1;
    }

    Promise.all(animationPromiseList).finally(() => {
        globalState.isTransitioning = false;
        markFinished!();
    });

    clearSavedElementsAndBoundingRects();
}

function performTransitionGroups(animationPromiseList: Promise<any>[], groupsReady: string[]): boolean {
    let allReady = true;

    // Perform transition animation on changed elements.
    for (const [name, group] of globalState.groups) {
        if (groupsReady.includes(name))
            continue;

        if (group.elements.length > 1) {
            console.error(`Shared element group '${name}' contains multiple elements(${group.elements.length}). No transition animation will be performed.`)
        } else if (group.elements.length == 1) {
            const elStateNew = group.elements[0]();

            if (!elStateNew.dependencies.every(dep => groupsReady.includes(dep))) {
                allReady = false;
                continue;
            }

            // Set style for old and new element.
            const elOld = group.elOld?.el;
            const styleOld = elOld ? getComputedStyle(elOld) : undefined;

            const elNew = cloneElementForTransition(elStateNew.el);
            const rectNew = elStateNew.el.getBoundingClientRect();
            const styleNew = getComputedStyle(elStateNew.el);
            elNew.classList.add("se-transition-element-new");
            elNew.classList.add(`se-transition-element-new-${name}`);
            elNew.style.width = `${rectNew.width}px`;
            elNew.style.height = `${rectNew.height}px`;
            elNew.style.transformOrigin = "top left";
            elNew.style.opacity = "0";
            elNew.style.fontSize = styleNew.fontSize;
            elNew.style.lineHeight = styleNew.lineHeight;
            elNew.style.textAlign = styleNew.textAlign;

            // elOld may be non-existing
            if (elOld) {
                elOld.classList.add("se-transition-element-old");
                elOld.classList.add(`se-transition-element-old-${name}`);
                elOld.style.width = `${group.rectOld!.width}px`;
                elOld.style.height = `${group.rectOld!.height}px`;
                elOld.style.opacity = group.elOld?.fadeOutAnimation.initialOpacity ?? "1";
                elOld.style.fontSize = styleOld!.fontSize;
                elOld.style.lineHeight = styleOld!.lineHeight;
                elOld.style.textAlign = styleOld!.textAlign;
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
            if ((getTransformProperty(name)?.enable ?? true) && elOld) {
                elGroup.animate([{
                    // width: `${rectNew.width}px`,
                    // height: `${rectNew.height}px`,
                    transform: `matrix(${rectNew.width / group.rectOld!.width}, 0, 0, ${rectNew.height / group.rectOld!.height}, ${rectNew.x}, ${rectNew.y})`,
                }], mergeProps({
                    duration: 560,
                    easing: Easings.MotionDefault(),
                    fill: "both" as any,
                }, getTransformProperty(name)));
            }

            const fadeAnimations: Animation[] = [];
            if (elStateNew.fadeInAnimation.enable ?? true) {
                const anim = elNew.animate([{
                    opacity: 1,
                }], mergeProps({
                    duration: 150,
                    easing: Easings.OpacityDefault(),
                    fill: "both" as any,
                }, elStateNew.fadeInAnimation));
                fadeAnimations.push(anim);
            } else {
                elNew.style.opacity = elStateNew.fadeInAnimation.initialOpacity ?? "";
            }

            if (elOld && (group.elOld!.fadeOutAnimation.enable ?? true)) {
                const anim = elOld.animate([{
                    opacity: 0,
                }], mergeProps({
                    duration: 150,
                    easing: Easings.OpacityDefault(),
                    fill: "both" as any,
                }, group.elOld!.fadeOutAnimation));
                fadeAnimations.push(anim);
            }

            const transitionElements = {
                elGroup: elGroup,
                elPair: elPair,
                elOld: elOld,
                elNew: elNew,
            };

            const cbStateOld: TransitionCallbackState = {
                role: "out",
                isSingle: false,
                ...transitionElements
            };
            group.elOld?.onAnimationsReady?.(cbStateOld)

            const cbStateNew: TransitionCallbackState = {
                role: "in",
                isSingle: elOld === undefined,
                ...transitionElements
            };
            elStateNew.onAnimationsReady?.(cbStateNew);

            const animations = elGroup.getAnimations({ subtree: true });
            const animationsEnd = Promise.all(animations.map(anim => anim.finished));
            animationsEnd.finally(() => {
                elStateNew.el.classList.remove("--se-transition-internal-hidden");
                elStateNew.onAnimationsEnd?.(cbStateNew);
                group.elOld?.onAnimationsEnd?.(cbStateOld);
                fadeAnimations.forEach(anim => anim.finish());
                elGroup.remove();
            });
            animationPromiseList.push(animationsEnd);
        } else {
            const elStateOld = group.elOld!;

            if (!elStateOld.dependencies.every(dep => groupsReady.includes(dep))) {
                allReady = false;
                continue;
            }

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
                    duration: 150,
                    easing: Easings.OpacityDefault(),
                    fill: "forwards" as any,
                }, elStateOld.fadeOutAnimation));
            }

            const cbStateOld: TransitionCallbackState = {
                elGroup: elGroup,
                elPair: elPair,
                elOld: elOld,

                isSingle: true,
                role: "out",
            };

            elStateOld.onAnimationsReady?.(cbStateOld);

            const animations = elGroup.getAnimations({ subtree: true });
            const animationsEnd = Promise.all(animations.map(anim => anim.finished));
            animationsEnd.finally(() => {
                elStateOld.onAnimationsEnd?.(cbStateOld);
                elGroup.remove();
            });
            animationPromiseList.push(animationsEnd);
        }

        groupsReady.push(name);
    }

    return allReady;
}