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

function drawWaveform() {

    if (!currentBuffer) {
        return;
    }


    resizeCanvas();


    const width =
        waveform.width;

    const height =
        waveform.height;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /*
        We keep the amplitude range fixed.

        Audio samples are normally in [-1, 1].
    */

    const graphLeft = 70;
    const graphRight = width - 20;

    const graphTop = 20;
    const graphBottom = height - 45;

    const graphWidth =
        graphRight - graphLeft;

    const graphHeight =
        graphBottom - graphTop;


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


    if (
        channelSelect.value === "both" &&
        currentBuffer.numberOfChannels > 1
    ) {

        drawChannel(
            0,
            graphLeft,
            graphRight,
            graphTop,
            graphBottom,
            1
        );

        drawChannel(
            1,
            graphLeft,
            graphRight,
            graphTop,
            graphBottom,
            -1
        );

    }
    else {

        drawChannel(
            channelSelect.value === "right"
                ? 1
                : 0,

            graphLeft,
            graphRight,
            graphTop,
            graphBottom,

            1
        );
    }


    updateAxisLabel();

    updateViewInfo();
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
    data,
    left,
    right,
    top,
    bottom
) {

    const width =
        right - left;

    const height =
        bottom - top;


    const range =
        displayEnd - displayStart;


    /*
     * Determine how many pixels correspond
     * to one sample.
     */

    const samplesPerPixel =
        range / width;


    ctx.save();


    /*
     * Draw connecting signal line.
     */

    ctx.beginPath();


    for (
        let i = displayStart;
        i < displayEnd;
        i++
    ) {

        const samplePosition =
            i - displayStart;


        const x =
            left +
            (samplePosition / (range - 1)) *
            width;


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


    /*
     * Choose signal color.
     */

    if (
        channelSelect.value === "both"
    ) {

        /*
         * Left channel
         */

        if (
            data ===
            currentBuffer.getChannelData(0)
        ) {

            ctx.strokeStyle =
                "#8b7cff";

        }

        /*
         * Right channel
         */

        else {

            ctx.strokeStyle =
                "#4cc9f0";
        }

    }
    else {

        ctx.strokeStyle =
            "#3da9ff";
    }


    ctx.lineWidth = 1.6;

    ctx.stroke();


    /*
     * Draw sample points.
     *
     * We don't want to draw a huge number of
     * circles if the samples become dense.
     */

    const pointSpacing =
        width / range;


    if (pointSpacing >= 2) {

        for (
            let i = displayStart;
            i < displayEnd;
            i++
        ) {

            const samplePosition =
                i - displayStart;


            const x =
                left +
                (samplePosition / (range - 1)) *
                width;


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
                2.8,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                "#3da9ff";

            ctx.fill();
        }
    }


    ctx.restore();
}


function drawSignalEnvelope(
    data,
    left,
    right,
    top,
    bottom
) {

    const width =
        right - left;

    const height =
        bottom - top;


    const range =
        displayEnd - displayStart;


    const pixels =
        Math.floor(width);


    ctx.save();


    ctx.beginPath();


    for (
        let pixel = 0;
        pixel < pixels;
        pixel++
    ) {

        /*
         * Calculate the sample range belonging
         * to this particular screen pixel.
         */

        let start =
            Math.floor(
                displayStart +
                (pixel / pixels) * range
            );


        let end =
            Math.floor(
                displayStart +
                ((pixel + 1) / pixels) * range
            );


        /*
         * IMPORTANT:
         *
         * Never allow an empty interval.
         */

        if (end <= start) {

            end = start + 1;
        }


        end =
            Math.min(
                end,
                displayEnd
            );


        /*
         * Make sure start is valid.
         */

        start =
            Math.max(
                start,
                displayStart
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


            if (value < min) {
                min = value;
            }


            if (value > max) {
                max = value;
            }
        }


        /*
         * If there was no valid sample,
         * skip this pixel.
         */

        if (
            min === Infinity ||
            max === -Infinity
        ) {

            continue;
        }


        const x =
            left + pixel;


        const yMin =
            top +
            ((1 - max) / 2) *
            height;


        const yMax =
            top +
            ((1 - min) / 2) *
            height;


        ctx.moveTo(
            x,
            yMin
        );

        ctx.lineTo(
            x,
            yMax
        );
    }


    ctx.strokeStyle =
        "#3da9ff";

    ctx.lineWidth = 1.2;

    ctx.stroke();


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