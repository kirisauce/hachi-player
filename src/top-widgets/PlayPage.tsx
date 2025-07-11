import { JSX, mergeProps, splitProps } from "solid-js";
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

    return <SharedElement name="play-page">
        <div class="play-page" {...opacityProps}>
            <div class="play-page-area-a">
                <SharedElement name="music-info-picture">
                    <div class="play-page-picture"></div>
                </SharedElement>
                <PlayPageInfo title={props.title} artist={props.artist} album={props.album} />
            </div>
            <div class="play-page-area-b">
            </div>
        </div>
    </SharedElement>;
}