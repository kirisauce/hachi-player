import { JSX } from "solid-js";
import "./PlayPage.scss";
import { SharedElement } from "../SharedElement";
import { Easings } from "../Util";
import { useApp } from "../Contexts";

export interface PlayPageProps extends JSX.HTMLAttributes<HTMLDivElement> {}

function PlayPageInfo() {
    const { musicInfo } = useApp();

    return <div class="play-page-info">
        <SharedElement name="music-info-title">
            <div class="play-page-info-title">{musicInfo.title}</div>
        </SharedElement>
        <SharedElement name="music-info-artist">
            <div class="play-page-info-artist">{musicInfo.artist?.join(", ")}</div>
        </SharedElement>
        <SharedElement name="music-info-album">
            <div class="play-page-info-album">{musicInfo.album}</div>
        </SharedElement>
    </div>;
}

export function PlayPage(props: PlayPageProps): JSX.Element {
    return <SharedElement
        name="play-page"
        dependencies={["music-info-picture", "music-info-title", "music-info-artist", "music-info-album"]}
        fadeInAnimationProps={{ enable: false }}
        fadeOutAnimationProps={{ enable: false }}
        onAnimationsReady={(state) => {
            state.elGroup.animate([{
                transform: "translateY(120%)",
            }, {
                transform: "translateY(0)",
            }], {
                duration: 550,
                easing: Easings.MotionDefault(),
                fill: "both",
                direction: state.role == "in" ? "normal" : "reverse",
            });
        }}
    >
        <div class="play-page" {...props}>
            <div class="play-page-area-a">
                <SharedElement name="music-info-picture">
                    <div class="play-page-picture"></div>
                </SharedElement>
                <PlayPageInfo />
            </div>
            <div class="play-page-area-b">
            </div>
        </div>
    </SharedElement>;
}