import { createSignal, JSX, mergeProps, onCleanup, onMount, Show, splitProps } from "solid-js";
import "./PlayPage.scss";
import { SharedElement } from "../SharedElement";

const defaultProps = {
    title: "NO TITLE",
    artist: "NO ARTIST",
    album: "NO ALBUM",
};

export interface PlayPageProps extends JSX.HTMLAttributes<HTMLDivElement> {
    picture?: any;
    title?: string;
    artist?: string;
    album?: string;
}

function PlayPageInfo(props: {
    title?: string;
    artist?: string;
    album?: string;
}) {
    return <div class="play-page-info">
        <SharedElement name="music-info-title">
            <div class="play-page-info-title">{props.title}</div>
        </SharedElement>
        <SharedElement name="music-info-artist">
            <div class="play-page-info-artist">{props.artist}</div>
        </SharedElement>
        <SharedElement name="music-info-album">
            <div class="play-page-info-album">{props.album}</div>
        </SharedElement>
    </div>;
}

export function PlayPage(rawProps: PlayPageProps): JSX.Element {
    const filledProps = mergeProps(defaultProps, rawProps);
    const [props, opacityProps] = splitProps(filledProps, [
        "picture",
        "title",
        "artist",
        "album",
        "ref"
    ]);
    const [useNormalLayout, setUseNormalLayout] = createSignal(true);

    let elPicture, elAreaA;

    onMount(() => {
        const updateLayout = (rect: DOMRectReadOnly) => {
            const size = `${Math.min(rect.width, rect.height)}px`;
            (elPicture! as HTMLDivElement).style.flexBasis = size;
            (elPicture! as HTMLDivElement).style.width = size;
            setUseNormalLayout(rect.width < rect.height);
        };
        updateLayout(elAreaA!.getBoundingClientRect());
        const observer = new ResizeObserver(entries => {
            if (entries.length > 0) {
                const rect = entries[0].contentRect;
                updateLayout(rect);
            }
        });
        observer.observe(elAreaA! as HTMLDivElement);
        onCleanup(() => observer.disconnect());
    });

    return (<div class="play-page" {...opacityProps}>
        <div class="play-page-area-a" ref={elAreaA}>
            <SharedElement name="music-info-picture">
                <div class="play-page-picture" ref={elPicture}></div>
            </SharedElement>
            <Show when={useNormalLayout()}>
                <PlayPageInfo title={props.title} artist={props.artist} album={props.album} />
            </Show>
        </div>
        <div class="play-page-area-b">
            <Show when={!useNormalLayout()}>
                <PlayPageInfo title={props.title} artist={props.artist} album={props.album} />
            </Show>
        </div>
    </div>);
}