import { JSX, mergeProps, Show, splitProps } from "solid-js";
import "./MusicBar.scss";
import { PauseRounded } from "../MaterialSymbolsLight";
import { SharedElement } from "../SharedElement";
import { useApp } from "../Contexts";

const defaultProps = {
    showPicture: true,
    showInfoText: true,
};

export interface MusicBarProps extends JSX.HTMLAttributes<HTMLDivElement> {
    onSwitchPage?: () => void;
    showPicture?: boolean,
    showInfoText?: boolean,
}

export function MusicBar(rawProps: MusicBarProps): JSX.Element {
    const filledProps = mergeProps(defaultProps, rawProps);
    const [props, opacityProps] = splitProps(filledProps, [
        "onSwitchPage",
        "showPicture",
        "showInfoText",
    ]);
    const app = useApp();

    return (<div class="music-bar" {...opacityProps}>
        <div class="music-bar-info" onClick={props.onSwitchPage}>
            <Show when={props.showPicture}>
                <SharedElement name="music-info-picture">
                    <div class="music-bar-info-picture">{app.musicInfo.picture}</div>
                </SharedElement>
            </Show>
            <Show when={props.showInfoText}>
                <div class="music-bar-info-text">
                    <SharedElement name="music-info-title">
                        <div class="music-bar-info-title">{app.musicInfo.title}</div>
                    </SharedElement>
                    <SharedElement name="music-info-artist">
                        <div class="music-bar-info-artist">{app.musicInfo.artist?.join(", ")}</div>
                    </SharedElement>
                    <SharedElement name="music-info-album">
                        <div class="music-bar-info-album">{app.musicInfo.album}</div>
                    </SharedElement>
                </div>
            </Show>
        </div>
        <div class="music-bar-controls">
            <SharedElement name="music-bar-controls-play-or-pause">
                <div class="music-bar-controls-play-or-pause"><PauseRounded class="music-bar-svg-fill-parent" /></div>
            </SharedElement>
        </div>
        <div class="music-bar-utilities">
            <div class="music-bar-utilities-equalizer"></div>
            <div class="music-bar-utilities-playlist"></div>
        </div>
    </div>);
};