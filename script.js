const audioFile = document.getElementById("audioFile");
const audioPlayer = document.getElementById("audioPlayer");

const editor = document.getElementById("editor");
const dropZone = document.getElementById("dropZone");

const fileName = document.getElementById("fileName");
const fileType = document.getElementById("fileType");

const sampleRateText = document.getElementById("sampleRate");
const currentRateText = document.getElementById("currentRate");

const samplesText = document.getElementById("samples");
const durationText = document.getElementById("duration");
const channelsText = document.getElementById("channels");
const samplingPeriodText =
    document.getElementById("samplingPeriod");

const rmsText = document.getElementById("rms");

const minValueText =
    document.getElementById("minValue");

const maxValueText =
    document.getElementById("maxValue");

const channelSelect =
    document.getElementById("channelSelect");

const xAxisSelect =
    document.getElementById("xAxisSelect");

const startSampleInput =
    document.getElementById("startSample");

const sampleCountInput =
    document.getElementById("sampleCount");

const applySelection =
    document.getElementById("applySelection");

const showAll =
    document.getElementById("showAll");

const newSampleRate =
    document.getElementById("newSampleRate");

const resampleButton =
    document.getElementById("resampleButton");

const resetZoom =
    document.getElementById("resetZoom");

const waveform =
    document.getElementById("waveform");

const ctx =
    waveform.getContext("2d");

const cursorInfo =
    document.getElementById("cursorInfo");

const cursorSample =
    document.getElementById("cursorSample");

const cursorTime =
    document.getElementById("cursorTime");

const cursorValue =
    document.getElementById("cursorValue");

const xAxisLabel =
    document.getElementById("xAxisLabel");

const viewInfo =
    document.getElementById("viewInfo");


let audioContext = null;
let audioBuffer = null;

let currentBuffer = null;

let displayStart = 0;
let displayEnd = 0;

let currentFile = null;

let playbackSample = 0;

/* =========================================================
   FILE LOADING
========================================================= */

audioFile.addEventListener("change", function () {

    const file = audioFile.files[0];

    if (!file) {
        return;
    }

    loadAudioFile(file);
});


function loadAudioFile(file) {

    currentFile = file;

    fileName.textContent = file.name;

    fileType.textContent =
        file.type || "Audio file";

    const audioURL =
        URL.createObjectURL(file);

    audioPlayer.src = audioURL;


    const reader = new FileReader();


    reader.onload = async function () {

        try {

            if (!audioContext) {

                audioContext =
                    new AudioContext();
            }


            const decoded =
                await audioContext.decodeAudioData(
                    reader.result.slice(0)
                );


            audioBuffer = decoded;

            currentBuffer = decoded;

            displayStart = 0;

            displayEnd = decoded.length;


            editor.classList.remove("hidden");

            updateSignalInformation();

            drawWaveform();

        }
        catch (error) {

            console.error(error);

            alert(
                "The browser could not decode this audio file."
            );
        }

    };


    reader.readAsArrayBuffer(file);
}


/* =========================================================
   SIGNAL INFORMATION
========================================================= */

function updateSignalInformation() {

    if (!currentBuffer) {
        return;
    }


    const fs =
        currentBuffer.sampleRate;

    const N =
        currentBuffer.length;

    const duration =
        currentBuffer.duration;

    const channels =
        currentBuffer.numberOfChannels;


    sampleRateText.textContent =
        formatFrequency(fs);

    currentRateText.textContent =
        formatFrequency(fs);

    samplesText.textContent =
        N.toLocaleString();

    durationText.textContent =
        formatTime(duration);

    channelsText.textContent =
        channels === 1
            ? "Mono"
            : `${channels} (Stereo)`;


    const Ts =
        1 / fs;


    samplingPeriodText.textContent =
        formatTimeSmall(Ts);


    updateStatistics();

    startSampleInput.max =
        Math.max(0, N - 1);

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const data =
        getSelectedChannelData();

    if (!data) {
        return;
    }


    let min = Infinity;
    let max = -Infinity;

    let sumSquares = 0;


    for (let i = 0; i < data.length; i++) {

        const value = data[i];

        if (value < min) {
            min = value;
        }

        if (value > max) {
            max = value;
        }

        sumSquares += value * value;
    }


    const rms =
        Math.sqrt(
            sumSquares / data.length
        );


    minValueText.textContent =
        min.toFixed(4);

    maxValueText.textContent =
        max.toFixed(4);

    rmsText.textContent =
        rms.toFixed(4);
}


/* =========================================================
   CHANNEL DATA
========================================================= */

function getSelectedChannelData() {

    if (!currentBuffer) {
        return null;
    }


    let channel;


    if (channelSelect.value === "right") {

        channel =
            currentBuffer.numberOfChannels > 1
                ? 1
                : 0;

    }
    else {

        channel = 0;
    }


    return currentBuffer.getChannelData(channel);
}


/* =========================================================
   WAVEFORM DRAWING
========================================================= */
function drawPlayhead() {

    if (!currentBuffer) {
        return;
    }

    const graphLeft = 70;
    const graphRight =
        waveform.clientWidth - 20;

    const graphTop = 20;
    const graphBottom =
        waveform.clientHeight - 45;

    const range =
        displayEnd - displayStart;

    if (range <= 0) {
        return;
    }

    /*
     * Is the current sample visible?
     */
    if (
        playbackSample < displayStart ||
        playbackSample > displayEnd
    ) {
        return;
    }

    /*
     * Convert sample number to
     * horizontal position.
     */
    const ratio =
        (playbackSample - displayStart) /
        range;

    const x =
        graphLeft +
        ratio *
        (graphRight - graphLeft);

    ctx.save();

    /*
     * Playhead line
     */
    ctx.beginPath();

    ctx.moveTo(
        x,
        graphTop
    );

    ctx.lineTo(
        x,
        graphBottom
    );

    ctx.strokeStyle =
        "#ff4d8d";

    ctx.lineWidth = 2;

    ctx.stroke();

    /*
     * Small circle at the top
     */
    ctx.beginPath();

    ctx.arc(
        x,
        graphTop,
        5,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "#ff4d8d";

    ctx.fill();

    ctx.restore();
}


function drawWaveform() {

    if (!currentBuffer) {
        return;
    }

    resizeCanvas();

    const width = waveform.clientWidth;
    const height = waveform.clientHeight;

    ctx.clearRect(0, 0, width, height);

    const graphLeft = 70;
    const graphRight = width - 20;

    const graphTop = 20;
    const graphBottom = height - 45;

    drawGrid(
        graphLeft,
        graphRight,
        graphTop,
        graphBottom
    );

    drawAxes(
        graphLeft,
        graphRight,
        graphTop,
        graphBottom
    );

    /*
     * Decide how the signal should be displayed.
     */

    const visibleSamples =
        displayEnd - displayStart;

    if (
        channelSelect.value === "both" &&
        currentBuffer.numberOfChannels > 1
    ) {

        drawAdaptiveChannel(
            0,
            graphLeft,
            graphRight,
            graphTop,
            graphBottom
        );

        drawAdaptiveChannel(
            1,
            graphLeft,
            graphRight,
            graphTop,
            graphBottom
        );

    }
    else {

        const channel =
            channelSelect.value === "right"
                ? 1
                : 0;

        drawAdaptiveChannel(
            channel,
            graphLeft,
            graphRight,
            graphTop,
            graphBottom
        );
    }

    updateAxisLabel();

    updateViewInfo();
    drawPlayhead();
}


function drawAdaptiveChannel(
    channelIndex,
    left,
    right,
    top,
    bottom
) {

    const visibleSamples =
        displayEnd - displayStart;


    /*
     * Very zoomed in:
     *
     * Show individual discrete-time samples.
     */

    if (visibleSamples <= 150) {

        drawDiscreteSignal(
            channelIndex,
            left,
            right,
            top,
            bottom
        );

        return;
    }


    /*
     * Medium zoom:
     *
     * Draw actual sample-to-sample waveform.
     */

    if (visibleSamples <= 5000) {

        drawActualSamples(
            channelIndex,
            left,
            right,
            top,
            bottom
        );

        return;
    }


    /*
     * Zoomed out:
     *
     * Use min/max envelope.
     */

    drawSignalEnvelope(
        channelIndex,
        left,
        right,
        top,
        bottom
    );
}


function drawDiscreteSignal(
    channelIndex,
    left,
    right,
    top,
    bottom
) {

    const data =
        currentBuffer.getChannelData(
            Math.min(
                channelIndex,
                currentBuffer.numberOfChannels - 1
            )
        );


    const width =
        right - left;

    const height =
        bottom - top;


    const range =
        displayEnd - displayStart;


    if (range <= 0) {
        return;
    }


    const zeroY =
        top + height / 2;


    /*
     * Distance between samples.
     */

    const spacing =
        width / Math.max(1, range - 1);


    /*
     * Choose channel colour.
     */

    let signalColor = "#3da9ff";

    if (
        channelSelect.value === "both"
    ) {

        signalColor =
            channelIndex === 0
                ? "#8b7cff"
                : "#4cc9f0";
    }


    ctx.save();

    ctx.strokeStyle =
        signalColor;

    ctx.fillStyle =
        signalColor;

    ctx.lineWidth = 1.5;


    /*
     * Draw stems.
     */

    for (
        let i = displayStart;
        i < displayEnd;
        i++
    ) {

        const relativeIndex =
            i - displayStart;


        const x =
            left +
            relativeIndex * spacing;


        const value =
            data[i];


        const y =
            top +
            ((1 - value) / 2) *
            height;


        /*
         * Vertical stem.
         */

        ctx.beginPath();

        ctx.moveTo(
            x,
            zeroY
        );

        ctx.lineTo(
            x,
            y
        );

        ctx.stroke();


        /*
         * Sample point.
         */

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();


        /*
         * Sample index.
         *
         * Only show labels when there
         * is enough room.
         */

        if (spacing >= 35) {

            ctx.fillStyle =
                "#aab4c9";

            ctx.font =
                "10px Inter, sans-serif";

            ctx.textAlign =
                "center";

            ctx.textBaseline =
                "top";


            ctx.fillText(
                `n=${i}`,
                x,
                bottom + 12
            );


            ctx.fillStyle =
                signalColor;
        }
    }


    /*
     * Connect the samples with a thin line.
     *
     * This makes the relationship between
     * the continuous-looking waveform and
     * the discrete samples easier to see.
     */

    ctx.beginPath();


    for (
        let i = displayStart;
        i < displayEnd;
        i++
    ) {

        const relativeIndex =
            i - displayStart;


        const x =
            left +
            relativeIndex * spacing;


        const value =
            data[i];


        const y =
            top +
            ((1 - value) / 2) *
            height;


        if (i === displayStart) {

            ctx.moveTo(x, y);

        }
        else {

            ctx.lineTo(x, y);
        }
    }


    ctx.globalAlpha = 0.35;

    ctx.lineWidth = 1;

    ctx.stroke();


    ctx.restore();
}
/* =========================================================
   GRID
========================================================= */

function drawGrid(
    left,
    right,
    top,
    bottom
) {

    const width =
        right - left;

    const height =
        bottom - top;


    ctx.save();

    ctx.lineWidth = 1;


    /*
        Horizontal grid.
    */

    const horizontalLines = 8;


    for (
        let i = 0;
        i <= horizontalLines;
        i++
    ) {

        const y =
            top +
            (height / horizontalLines) * i;


        ctx.strokeStyle =
            "rgba(150,165,200,0.13)";

        ctx.beginPath();

        ctx.moveTo(left, y);

        ctx.lineTo(right, y);

        ctx.stroke();


        /*
            Amplitude labels
        */

        const value =
            1 - (2 * i / horizontalLines);


        ctx.fillStyle =
            "#737e96";

        ctx.font =
            "11px Inter, sans-serif";

        ctx.textAlign =
            "right";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            value.toFixed(2),
            left - 10,
            y
        );
    }


    /*
        Vertical grid.
    */

    const verticalLines = 10;


    for (
        let i = 0;
        i <= verticalLines;
        i++
    ) {

        const x =
            left +
            (width / verticalLines) * i;


        ctx.strokeStyle =
            "rgba(150,165,200,0.10)";


        ctx.beginPath();

        ctx.moveTo(x, top);

        ctx.lineTo(x, bottom);

        ctx.stroke();
    }


    ctx.restore();
}


/* =========================================================
   AXES
========================================================= */

function drawAxes(
    left,
    right,
    top,
    bottom
) {

    ctx.save();


    /*
        Zero-amplitude axis.
    */

    const zeroY =
        top + (bottom - top) / 2;


    ctx.strokeStyle =
        "rgba(190,200,220,0.38)";

    ctx.lineWidth = 1.5;

    ctx.beginPath();

    ctx.moveTo(left, zeroY);

    ctx.lineTo(right, zeroY);

    ctx.stroke();


    /*
        Border
    */

    ctx.strokeStyle =
        "rgba(150,165,200,0.22)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        left,
        top,
        right - left,
        bottom - top
    );


    /*
        X-axis labels.
    */

    const verticalLines = 10;

    const range =
        displayEnd - displayStart;


    ctx.fillStyle =
        "#737e96";

    ctx.font =
        "11px Inter, sans-serif";

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "top";


    for (
        let i = 0;
        i <= verticalLines;
        i++
    ) {

        const x =
            left +
            ((right - left) / verticalLines) * i;


        const sample =
            displayStart +
            (range / verticalLines) * i;


        let label;


        if (xAxisSelect.value === "samples") {

            label =
                Math.round(sample).toLocaleString();

        }
        else {

            const time =
                sample /
                currentBuffer.sampleRate;


            label =
                formatAxisTime(time);
        }


        ctx.fillText(
            label,
            x,
            bottom + 10
        );
    }


    ctx.restore();
}


/* =========================================================
   DRAW CHANNEL
========================================================= */

function drawChannel(
    channelIndex,
    left,
    right,
    top,
    bottom
) {

    const data =
        currentBuffer.getChannelData(
            Math.min(
                channelIndex,
                currentBuffer.numberOfChannels - 1
            )
        );


    const width =
        right - left;

    const height =
        bottom - top;


    const range =
        displayEnd - displayStart;


    if (range <= 0) {
        return;
    }


    /*
     * If the number of visible samples is reasonably small,
     * draw the actual samples.
     *
     * This is what we want for x[n].
     */
    const MAX_VISIBLE_SAMPLES = 5000;


    if (range <= MAX_VISIBLE_SAMPLES) {

        drawActualSamples(
            data,
            left,
            right,
            top,
            bottom
        );

    }

    /*
     * For very large signals, don't try to draw
     * every single sample.
     *
     * Instead, use min/max values for each pixel.
     */
    else {

        drawSignalEnvelope(
            data,
            left,
            right,
            top,
            bottom
        );
    }
}

function drawActualSamples(
    channelIndex,
    left,
    right,
    top,
    bottom
) {

    const data =
        currentBuffer.getChannelData(
            Math.min(
                channelIndex,
                currentBuffer.numberOfChannels - 1
            )
        );


    const width =
        right - left;

    const height =
        bottom - top;


    const range =
        displayEnd - displayStart;


    if (range <= 0) {
        return;
    }


    const spacing =
        width / Math.max(1, range - 1);


    let signalColor = "#3da9ff";


    if (
        channelSelect.value === "both"
    ) {

        signalColor =
            channelIndex === 0
                ? "#8b7cff"
                : "#4cc9f0";
    }


    ctx.save();


    /*
     * Draw waveform.
     */

    ctx.beginPath();


    for (
        let i = displayStart;
        i < displayEnd;
        i++
    ) {

        const relativeIndex =
            i - displayStart;


        const x =
            left +
            relativeIndex * spacing;


        const value =
            data[i];


        const y =
            top +
            ((1 - value) / 2) *
            height;


        if (i === displayStart) {

            ctx.moveTo(x, y);

        }
        else {

            ctx.lineTo(x, y);
        }
    }


    ctx.strokeStyle =
        signalColor;

    ctx.lineWidth = 1.5;

    ctx.stroke();


    /*
     * If samples have enough spacing,
     * show their actual locations.
     */

    if (spacing >= 3) {

        for (
            let i = displayStart;
            i < displayEnd;
            i++
        ) {

            const relativeIndex =
                i - displayStart;


            const x =
                left +
                relativeIndex * spacing;


            const value =
                data[i];


            const y =
                top +
                ((1 - value) / 2) *
                height;


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                2.3,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                signalColor;

            ctx.fill();
        }
    }


    ctx.restore();
}

function drawSignalEnvelope(
    channelIndex,
    left,
    right,
    top,
    bottom
) {

    const data =
        currentBuffer.getChannelData(
            Math.min(
                channelIndex,
                currentBuffer.numberOfChannels - 1
            )
        );


    const width =
        right - left;

    const height =
        bottom - top;


    const range =
        displayEnd - displayStart;


    const pixels =
        Math.max(1, Math.floor(width));


    let signalColor = "#3da9ff";


    if (
        channelSelect.value === "both"
    ) {

        signalColor =
            channelIndex === 0
                ? "#8b7cff"
                : "#4cc9f0";
    }


    ctx.save();

    ctx.strokeStyle =
        signalColor;

    ctx.lineWidth = 1.2;


    for (
        let pixel = 0;
        pixel < pixels;
        pixel++
    ) {

        let start =
            Math.floor(
                displayStart +
                pixel / pixels * range
            );


        let end =
            Math.floor(
                displayStart +
                (pixel + 1) / pixels * range
            );


        if (end <= start) {
            end = start + 1;
        }


        end =
            Math.min(
                end,
                displayEnd
            );


        let min = Infinity;
        let max = -Infinity;


        for (
            let i = start;
            i < end;
            i++
        ) {

            const value =
                data[i];


            min =
                Math.min(
                    min,
                    value
                );


            max =
                Math.max(
                    max,
                    value
                );
        }


        if (
            min === Infinity ||
            max === -Infinity
        ) {

            continue;
        }


        const x =
            left + pixel;


        const yMax =
            top +
            ((1 - max) / 2) *
            height;


        const yMin =
            top +
            ((1 - min) / 2) *
            height;


        /*
         * Draw the min-max range for this
         * screen pixel.
         */

        ctx.beginPath();

        ctx.moveTo(
            x,
            yMax
        );

        ctx.lineTo(
            x,
            yMin
        );

        ctx.stroke();
    }


    ctx.restore();
}


/* =========================================================
   MOUSE INSPECTION
========================================================= */

waveform.addEventListener(
    "mousemove",
    function (event) {

        if (!currentBuffer) {
            return;
        }


        const rect =
            waveform.getBoundingClientRect();


        const x =
            event.clientX -
            rect.left;


        const graphLeft =
            70;


        const graphRight =
            waveform.clientWidth - 20;


        if (
            x < graphLeft ||
            x > graphRight
        ) {

            cursorInfo.classList.add(
                "hidden"
            );

            return;
        }


        const ratio =
            (x - graphLeft) /
            (graphRight - graphLeft);


        const sample =
            Math.floor(
                displayStart +
                ratio *
                (displayEnd - displayStart)
            );


        const channel =
            channelSelect.value === "right"
                ? Math.min(
                    1,
                    currentBuffer.numberOfChannels - 1
                )
                : 0;


        const data =
            currentBuffer.getChannelData(
                channel
            );


        const value =
            data[
                Math.min(
                    sample,
                    data.length - 1
                )
            ];


        const time =
            sample /
            currentBuffer.sampleRate;


        cursorSample.textContent =
            sample.toLocaleString();

        cursorTime.textContent =
            formatTime(time);

        cursorValue.textContent =
            value.toFixed(6);


        cursorInfo.classList.remove(
            "hidden"
        );
    }
);


waveform.addEventListener(
    "mouseleave",
    function () {

        cursorInfo.classList.add(
            "hidden"
        );

    }
);


/* =========================================================
   X AXIS
========================================================= */

xAxisSelect.addEventListener(
    "change",
    function () {

        drawWaveform();

    }
);


function updateAxisLabel() {

    if (
        xAxisSelect.value === "samples"
    ) {

        xAxisLabel.textContent =
            "Sample Index (n)";

    }
    else {

        xAxisLabel.textContent =
            "Time (seconds)";
    }
}


/* =========================================================
   CHANNEL
========================================================= */

channelSelect.addEventListener(
    "change",
    function () {

        updateStatistics();

        drawWaveform();

    }
);


/* =========================================================
   SELECTION
========================================================= */

applySelection.addEventListener(
    "click",
    function () {

        if (!currentBuffer) {
            return;
        }


        let start =
            parseInt(
                startSampleInput.value
            );


        let count =
            parseInt(
                sampleCountInput.value
            );


        if (isNaN(start)) {
            start = 0;
        }


        if (isNaN(count) || count < 1) {
            count = 1;
        }


        start =
            Math.max(
                0,
                Math.min(
                    start,
                    currentBuffer.length - 1
                )
            );


        const end =
            Math.min(
                start + count,
                currentBuffer.length
            );


        displayStart = start;

        displayEnd = end;


        drawWaveform();

    }
);


/* =========================================================
   SHOW ALL
========================================================= */

showAll.addEventListener(
    "click",
    function () {

        if (!currentBuffer) {
            return;
        }


        displayStart = 0;

        displayEnd =
            currentBuffer.length;


        startSampleInput.value = 0;

        sampleCountInput.value =
            currentBuffer.length;


        drawWaveform();

    }
);


/* =========================================================
   RESET ZOOM
========================================================= */

resetZoom.addEventListener(
    "click",
    function () {

        if (!currentBuffer) {
            return;
        }


        displayStart = 0;

        displayEnd =
            currentBuffer.length;


        drawWaveform();

    }
);


/* =========================================================
   RESAMPLING
========================================================= */

resampleButton.addEventListener(
    "click",
    async function () {

        if (!currentBuffer) {
            return;
        }


        const newRate =
            parseInt(
                newSampleRate.value
            );


        if (
            newRate ===
            currentBuffer.sampleRate
        ) {

            alert(
                "The signal is already at this sample rate."
            );

            return;
        }


        resampleButton.disabled = true;

        resampleButton.textContent =
            "Resampling...";


        try {

            const offlineContext =
                new OfflineAudioContext(
                    currentBuffer.numberOfChannels,
                    Math.ceil(
                        currentBuffer.duration *
                        newRate
                    ),
                    newRate
                );


            const source =
                offlineContext.createBufferSource();


            source.buffer =
                currentBuffer;


            source.connect(
                offlineContext.destination
            );


            source.start();


            const rendered =
                await offlineContext.startRendering();


            currentBuffer =
                rendered;


            audioBuffer =
                rendered;


            displayStart = 0;

            displayEnd =
                rendered.length;


            updateSignalInformation();

            drawWaveform();


        }
        catch (error) {

            console.error(error);

            alert(
                "Resampling failed."
            );

        }


        resampleButton.disabled = false;

        resampleButton.textContent =
            "Resample";
    }
);


/* =========================================================
   CANVAS RESIZE
========================================================= */

function resizeCanvas() {

    const rect =
        waveform.getBoundingClientRect();


    const pixelRatio =
        window.devicePixelRatio || 1;


    waveform.width =
        rect.width * pixelRatio;


    waveform.height =
        rect.height * pixelRatio;


    ctx.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
    );
}


window.addEventListener(
    "resize",
    function () {

        if (currentBuffer) {
            drawWaveform();
        }

    }
);


/* =========================================================
   FORMATTING
========================================================= */

function formatFrequency(
    frequency
) {

    if (frequency >= 1000) {

        return (
            frequency / 1000
        ).toFixed(
            frequency % 1000 === 0
                ? 0
                : 2
        ) + " kHz";

    }


    return frequency + " Hz";
}


function formatTime(seconds) {

    if (seconds < 1) {

        return (
            seconds * 1000
        ).toFixed(2) + " ms";
    }


    if (seconds < 60) {

        return (
            seconds
        ).toFixed(2) + " s";
    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remaining =
        seconds -
        minutes * 60;


    return (
        minutes +
        ":" +
        remaining
            .toFixed(2)
            .padStart(5, "0")
    );
}


function formatTimeSmall(seconds) {

    if (seconds < 0.001) {

        return (
            seconds * 1e6
        ).toFixed(2) + " µs";
    }


    return (
        seconds * 1000
    ).toFixed(3) + " ms";
}


function formatAxisTime(seconds) {

    if (seconds < 1) {

        return (
            seconds * 1000
        ).toFixed(1) + " ms";
    }


    return seconds.toFixed(2) + " s";
}


function updateViewInfo() {

    if (!currentBuffer) {
        return;
    }


    const count =
        displayEnd -
        displayStart;


    const duration =
        count /
        currentBuffer.sampleRate;


    if (
        displayStart === 0 &&
        displayEnd === currentBuffer.length
    ) {

        viewInfo.textContent =
            "Entire signal";

    }
    else {

        viewInfo.textContent =
            `${count.toLocaleString()} samples · ${formatTime(duration)}`;
    }
}


/* =========================================================
   DRAG & DROP
========================================================= */

dropZone.addEventListener(
    "dragover",
    function (event) {

        event.preventDefault();

        dropZone.style.borderColor =
            "#7c6cff";

    }
);


dropZone.addEventListener(
    "dragleave",
    function () {

        dropZone.style.borderColor =
            "";

    }
);


dropZone.addEventListener(
    "drop",
    function (event) {

        event.preventDefault();

        dropZone.style.borderColor =
            "";


        const file =
            event.dataTransfer.files[0];


        if (
            file &&
            file.type.startsWith("audio/")
        ) {

            loadAudioFile(file);

        }

    }
);

waveform.addEventListener(
    "wheel",
    function (event) {

        if (!currentBuffer) {
            return;
        }


        event.preventDefault();


        /*
         * Where is the mouse relative to
         * the actual graph?
         */

        const rect =
            waveform.getBoundingClientRect();


        const graphLeft = 70;

        const graphRight =
            waveform.clientWidth - 20;


        const mouseX =
            event.clientX -
            rect.left;


        /*
         * Don't zoom outside the graph.
         */

        if (
            mouseX < graphLeft ||
            mouseX > graphRight
        ) {

            return;
        }


        const ratio =
            (mouseX - graphLeft) /
            (graphRight - graphLeft);


        /*
         * Current visible range.
         */

        const currentRange =
            displayEnd -
            displayStart;


        /*
         * Zoom factor.
         *
         * Wheel up = zoom in
         * Wheel down = zoom out
         */

        const zoomFactor =
            event.deltaY < 0
                ? 0.75
                : 1.333;


        let newRange =
            currentRange *
            zoomFactor;


        /*
         * Never display less than 5 samples.
         */

        newRange =
            Math.max(
                5,
                newRange
            );


        /*
         * Don't go beyond the entire signal.
         */

        newRange =
            Math.min(
                currentBuffer.length,
                newRange
            );


        /*
         * Keep the sample underneath
         * the mouse in the same position.
         */

        const mouseSample =
            displayStart +
            ratio * currentRange;


        let newStart =
            mouseSample -
            ratio * newRange;


        let newEnd =
            newStart +
            newRange;


        /*
         * Keep range inside signal.
         */

        if (newStart < 0) {

            newStart = 0;

            newEnd =
                newRange;
        }


        if (
            newEnd >
            currentBuffer.length
        ) {

            newEnd =
                currentBuffer.length;

            newStart =
                newEnd -
                newRange;
        }


        displayStart =
            Math.max(
                0,
                Math.floor(newStart)
            );


        displayEnd =
            Math.min(
                currentBuffer.length,
                Math.ceil(newEnd)
            );


        drawWaveform();

    },
    {
        passive: false
    }
);

let isDragging = false;

let dragStartX = 0;

let dragStartSample = 0;



waveform.addEventListener(
    "mousedown",
    function (event) {

        if (!currentBuffer) {
            return;
        }


        isDragging = true;

        dragStartX =
            event.clientX;

        dragStartSample =
            displayStart;


        waveform.style.cursor =
            "grabbing";
    }
);


window.addEventListener(
    "mousemove",
    function (event) {

        if (
            !isDragging ||
            !currentBuffer
        ) {

            return;
        }


        const graphLeft = 70;

        const graphRight =
            waveform.clientWidth - 20;


        const graphWidth =
            graphRight -
            graphLeft;


        const range =
            displayEnd -
            displayStart;


        const pixelsMoved =
            event.clientX -
            dragStartX;


        const samplesMoved =
            pixelsMoved /
            graphWidth *
            range;


        let newStart =
            dragStartSample -
            samplesMoved;


        let newEnd =
            newStart +
            range;


        /*
         * Stop at beginning.
         */

        if (newStart < 0) {

            newStart = 0;

            newEnd = range;
        }


        /*
         * Stop at end.
         */

        if (
            newEnd >
            currentBuffer.length
        ) {

            newEnd =
                currentBuffer.length;

            newStart =
                newEnd -
                range;
        }


        displayStart =
            Math.floor(
                Math.max(
                    0,
                    newStart
                )
            );


        displayEnd =
            Math.ceil(
                Math.min(
                    currentBuffer.length,
                    newEnd
                )
            );


        drawWaveform();
    }
);


window.addEventListener(
    "mouseup",
    function () {

        if (!isDragging) {
            return;
        }


        isDragging = false;

        waveform.style.cursor =
            "crosshair";
    }
);

function moveViewToSample(sample) {

    if (!currentBuffer) {
        return;
    }

    const visibleSamples =
        displayEnd - displayStart;

    /*
     * If the sample is already visible,
     * don't move the graph.
     */
    if (
        sample >= displayStart &&
        sample <= displayEnd
    ) {
        return;
    }

    /*
     * Put the sample near the center.
     */
    displayStart =
        Math.floor(
            sample -
            visibleSamples / 2
        );

    displayEnd =
        displayStart +
        visibleSamples;

    /*
     * Don't go before the beginning.
     */
    if (displayStart < 0) {

        displayStart = 0;

        displayEnd =
            Math.min(
                currentBuffer.length,
                visibleSamples
            );
    }

    /*
     * Don't go beyond the end.
     */
    if (
        displayEnd >
        currentBuffer.length
    ) {

        displayEnd =
            currentBuffer.length;

        displayStart =
            Math.max(
                0,
                displayEnd -
                visibleSamples
            );
    }
}

audioPlayer.addEventListener(
    "timeupdate",
    function () {

        if (!currentBuffer) {
            return;
        }

        /*
         * Audio time → sample number
         */
        playbackSample =
            audioPlayer.currentTime *
            currentBuffer.sampleRate;

        /*
         * Make sure the sample is visible.
         */
        moveViewToSample(
            playbackSample
        );

        /*
         * Redraw.
         */
        drawWaveform();
    }
);

