import { JSX } from "solid-js";

export function clamp(min: number, num: number, max: number) {
    return Math.min(Math.max(num, min), max);
}

export const isElement = (obj: JSX.Element) => (typeof obj === "object") && !(obj instanceof Array);

export const isList = (obj: JSX.Element) => obj instanceof Array;

export namespace Easings {
    export const MdCrossAxis = "cubic-bezier(0.4, 0, 0.2, 1)";

    export const MotionDefault = () => MdCrossAxis;
    export const OpacityDefault = () => "ease-out";
}