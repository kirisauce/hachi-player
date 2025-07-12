import { createEffect, createSignal, JSX, Show } from "solid-js";
import "./App.scss";
import { MusicBar } from "./top-widgets/MusicBar";
import { createStore } from "solid-js/store";
import { PlayPage } from "./top-widgets/PlayPage";
import { SharedElement, startTransitionSE } from "./SharedElement";


function App(): JSX.Element {
    const [globalStyle, _setGlobalStyle] = createStore({
        "--theme-color": "#c1d3fe",
        "--shadow-color": "#2f2f2f22",
        "--deep-shadow-color": "#2f2f2f55",
    });

    createEffect(() => {
        Object.entries(globalStyle).forEach((entry) => {
            const [key, value] = entry;
            document.body.style.setProperty(key, value);
        })
    });

    const [playPageShow, setPlayPageShow] = createSignal(false);

    return (
        <main class="container">
            <div class="content-container">
                <Show when={playPageShow()}>
                    <PlayPage />
                </Show>
            </div>
            <SharedElement
                name="music-bar"
                fadeInAnimationProps={{ enable: false, initialOpacity: "1" }}
                fadeOutAnimationProps={{ enable: false, initialOpacity: "0" }}
            >
                <MusicBar
                    ref={(el: any) => {
                        el.style.flexBasis = "4rem";
                    }}

                    onSwitchPage={() => startTransitionSE(() => setPlayPageShow(val => !val))}
                    showPicture={!playPageShow()}
                    showInfoText={!playPageShow()}
                />
            </SharedElement>
        </main>
    );
}

export default App;
