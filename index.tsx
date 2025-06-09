
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Though GoogleGenAI is imported, it's not used in this specific simulator,
// as the calculations are deterministic math.
// It's included as per the general structure, for potential future AI integration.
import { GoogleGenAI } from "@google/genai";

// DOM Element References
let axInput: HTMLInputElement | null;
let ayInput: HTMLInputElement | null;
let calcMagAngleButton: HTMLButtonElement | null;
let magnitudeOutput: HTMLSpanElement | null;
let angleOutput: HTMLSpanElement | null;

let magInput: HTMLInputElement | null;
let angleDegInput: HTMLInputElement | null;
let calcComponentsButton: HTMLButtonElement | null;
let axOutput: HTMLSpanElement | null;
let ayOutput: HTMLSpanElement | null;

let vectorCanvas: HTMLCanvasElement | null;
let ctx: CanvasRenderingContext2D | null;

// Canvas constants
const PIXELS_PER_UNIT_DEFAULT = 20; // Default scale: 20 pixels represent 1 unit
let PIXELS_PER_UNIT = PIXELS_PER_UNIT_DEFAULT;
const GRID_COLOR = '#e0e0e0';
const AXIS_COLOR = '#888888';
const VECTOR_COLOR = '#e74c3c'; // A distinct red color for the vector
const ARROW_HEAD_SIZE = 8; // Size of the arrowhead
const INFO_TEXT_COLOR = '#2c3e50'; // Color for text on canvas

/**
 * Initializes the application after the DOM is fully loaded.
 * Sets up DOM element references and event listeners.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements for Component to Mag/Angle conversion
    axInput = document.getElementById('axInput') as HTMLInputElement;
    ayInput = document.getElementById('ayInput') as HTMLInputElement;
    calcMagAngleButton = document.getElementById('calcMagAngleButton') as HTMLButtonElement;
    magnitudeOutput = document.getElementById('magnitudeOutput') as HTMLSpanElement;
    angleOutput = document.getElementById('angleOutput') as HTMLSpanElement;

    // Initialize DOM elements for Mag/Angle to Component conversion
    magInput = document.getElementById('magInput') as HTMLInputElement;
    angleDegInput = document.getElementById('angleDegInput') as HTMLInputElement;
    calcComponentsButton = document.getElementById('calcComponentsButton') as HTMLButtonElement;
    axOutput = document.getElementById('axOutput') as HTMLSpanElement;
    ayOutput = document.getElementById('ayOutput') as HTMLSpanElement;

    // Initialize Canvas
    vectorCanvas = document.getElementById('vectorCanvas') as HTMLCanvasElement;
    if (vectorCanvas) {
        ctx = vectorCanvas.getContext('2d');
    }

    // Add event listeners
    if (calcMagAngleButton) {
        calcMagAngleButton.addEventListener('click', handleCalculateMagnitudeAngle);
    }
    if (calcComponentsButton) {
        calcComponentsButton.addEventListener('click', handleCalculateComponents);
    }

    // Initial draw and calculation
    // Use default values from the input fields to perform an initial calculation and drawing.
    // Prioritize component inputs if available, otherwise magnitude/angle.
    if (axInput && ayInput && axInput.value.trim() !== "" && ayInput.value.trim() !== "") {
        handleCalculateMagnitudeAngle();
    } else if (magInput && angleDegInput && magInput.value.trim() !== "" && angleDegInput.value.trim() !== "") {
         handleCalculateComponents();
    } else {
        // If all inputs are initially empty or invalid, set default components and calculate.
        if(axInput) axInput.value = "0"; // Default to 0,0 vector
        if(ayInput) ayInput.value = "0";
        handleCalculateMagnitudeAngle(); // This will calculate mag/angle for (0,0) and draw
    }
});

/**
 * Calculates magnitude and angle from components Ax and Ay.
 * Updates the UI with the results, syncs the other panel's inputs, and redraws the vector.
 */
function handleCalculateMagnitudeAngle(): void {
    if (!axInput || !ayInput || !magnitudeOutput || !angleOutput) return;

    const axVal = parseFloat(axInput.value);
    const ayVal = parseFloat(ayInput.value);

    // Validate inputs
    if (isNaN(axVal) || isNaN(ayVal)) {
        magnitudeOutput.textContent = "Invalid Input";
        angleOutput.textContent = "Invalid Input";
        if (magInput) magInput.value = ""; 
        if (angleDegInput) angleDegInput.value = "";
        drawScene(0, 0, 0, 0); // Draw a zero vector with zero mag/angle
        return;
    }
    
    axInput.value = String(axVal);
    ayInput.value = String(ayVal);

    const magnitude = Math.sqrt(axVal * axVal + ayVal * ayVal);
    let angleRad = Math.atan2(ayVal, axVal);
    let angleDeg = angleRad * (180 / Math.PI);

    magnitudeOutput.textContent = magnitude.toFixed(3);
    angleOutput.textContent = angleDeg.toFixed(3);

    if (magInput) magInput.value = magnitude.toFixed(3);
    if (angleDegInput) angleDegInput.value = angleDeg.toFixed(3);

    drawScene(axVal, ayVal, magnitude, angleDeg);
}

/**
 * Calculates components Ax and Ay from magnitude and angle.
 * Updates the UI with the results, syncs the other panel's inputs, and redraws the vector.
 */
function handleCalculateComponents(): void {
    if (!magInput || !angleDegInput || !axOutput || !ayOutput) return;

    const magnitudeVal = parseFloat(magInput.value);
    const angleDegVal = parseFloat(angleDegInput.value);

    if (isNaN(magnitudeVal) || isNaN(angleDegVal)) {
        axOutput.textContent = "Invalid Input";
        ayOutput.textContent = "Invalid Input";
        if (axInput) axInput.value = ""; 
        if (ayInput) ayInput.value = "";
        drawScene(0, 0, 0, 0); // Draw a zero vector with zero mag/angle
        return;
    }
    
    magInput.value = String(magnitudeVal);
    angleDegInput.value = String(angleDegVal);

    const angleRad = angleDegVal * (Math.PI / 180);
    const ax = magnitudeVal * Math.cos(angleRad);
    const ay = magnitudeVal * Math.sin(angleRad);

    axOutput.textContent = ax.toFixed(3);
    ayOutput.textContent = ay.toFixed(3);
    
    if (axInput) axInput.value = ax.toFixed(3);
    if (ayInput) ayInput.value = ay.toFixed(3);

    drawScene(ax, ay, magnitudeVal, angleDegVal);
}

/**
 * Adjusts the canvas scale (PIXELS_PER_UNIT) based on the vector's magnitude.
 * @param {number} magnitude - The magnitude of the vector.
 */
function adjustCanvasScale(magnitude: number): void {
    if (!vectorCanvas) return;
    const maxCanvasDim = Math.min(vectorCanvas.width, vectorCanvas.height) / 2; 

    if (magnitude === 0) {
        PIXELS_PER_UNIT = PIXELS_PER_UNIT_DEFAULT;
        return;
    }
    const targetPixelLength = maxCanvasDim * 0.65;
    PIXELS_PER_UNIT = targetPixelLength / magnitude;
    PIXELS_PER_UNIT = Math.max(2, Math.min(PIXELS_PER_UNIT, 100));
}


/**
 * Draws the entire scene on the canvas: grid, axes, vector, and vector information.
 * @param {number} ax - The x-component of the vector to draw.
 * @param {number} ay - The y-component of the vector to draw.
 * @param {number} magnitude - The magnitude of the vector.
 * @param {number} angleDeg - The angle of the vector in degrees.
 */
function drawScene(ax: number, ay: number, magnitude: number, angleDeg: number): void {
    if (!ctx || !vectorCanvas) return;

    adjustCanvasScale(magnitude); // Adjust scale based on current vector's magnitude

    const { width, height } = vectorCanvas;
    const originX = width / 2;
    const originY = height / 2;

    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx, width, height, originX, originY, PIXELS_PER_UNIT);
    drawAxes(ctx, width, height, originX, originY);

    if (!isNaN(ax) && !isNaN(ay)) {
        drawVector(ctx, originX, originY, ax, ay, PIXELS_PER_UNIT, VECTOR_COLOR);
        // Pass all necessary info to drawVectorInfo
        drawVectorInfo(ctx, originX, originY, ax, ay, magnitude, angleDeg, PIXELS_PER_UNIT);
    }
}

/**
 * Draws a grid on the canvas.
 * @param {CanvasRenderingContext2D} context - The canvas rendering context.
 * @param {number} canvasWidth - The width of the canvas.
 * @param {number} canvasHeight - The height of the canvas.
 * @param {number} originX - The x-coordinate of the grid's origin.
 * @param {number} originY - The y-coordinate of the grid's origin.
 * @param {number} unitSize - The size of one unit in pixels (PIXELS_PER_UNIT).
 */
function drawGrid(context: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, originX: number, originY: number, unitSize: number): void {
    context.beginPath();
    context.strokeStyle = GRID_COLOR;
    context.lineWidth = 0.5;

    for (let x = unitSize; x <= canvasWidth - originX; x += unitSize) {
        context.moveTo(originX + x, 0);
        context.lineTo(originX + x, canvasHeight);
        context.moveTo(originX - x, 0);
        context.lineTo(originX - x, canvasHeight);
    }
    for (let y = unitSize; y <= canvasHeight - originY; y += unitSize) {
        context.moveTo(0, originY + y);
        context.lineTo(canvasWidth, originY + y);
        context.moveTo(0, originY - y);
        context.lineTo(canvasWidth, originY - y);
    }
    context.stroke();
}

/**
 * Draws X and Y axes on the canvas.
 * @param {CanvasRenderingContext2D} context - The canvas rendering context.
 * @param {number} canvasWidth - The width of the canvas.
 * @param {number} canvasHeight - The height of the canvas.
 * @param {number} originX - The x-coordinate of the origin.
 * @param {number} originY - The y-coordinate of the origin.
 */
function drawAxes(context: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, originX: number, originY: number): void {
    context.beginPath();
    context.strokeStyle = AXIS_COLOR;
    context.lineWidth = 1.5;

    context.moveTo(0, originY);
    context.lineTo(canvasWidth, originY);
    context.moveTo(originX, 0);
    context.lineTo(originX, canvasHeight);
    context.stroke();

    context.fillStyle = AXIS_COLOR;
    context.font = "12px Arial";
    context.fillText("X", canvasWidth - 15, originY - 5);
    context.fillText("Y", originX + 5, 15);
}

/**
 * Draws a vector on the canvas from the origin to (ax, ay).
 * @param {CanvasRenderingContext2D} context - The canvas rendering context.
 * @param {number} originX - The x-coordinate of the vector's start point (origin).
 * @param {number} originY - The y-coordinate of the vector's start point (origin).
 * @param {number} ax - The x-component of the vector.
 * @param {number} ay - The y-component of the vector.
 * @param {number} unitSize - The size of one unit in pixels (PIXELS_PER_UNIT).
 * @param {string} color - The color of the vector.
 */
function drawVector(context: CanvasRenderingContext2D, originX: number, originY: number, ax: number, ay: number, unitSize: number, color: string): void {
    const endX = originX + ax * unitSize;
    const endY = originY - ay * unitSize; 

    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = 2.5;
    context.moveTo(originX, originY);
    context.lineTo(endX, endY);
    context.stroke();

    if (ax === 0 && ay === 0) return;

    const angle = Math.atan2(endY - originY, endX - originX); 
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(endX, endY);
    context.lineTo(endX - ARROW_HEAD_SIZE * Math.cos(angle - Math.PI / 6), endY - ARROW_HEAD_SIZE * Math.sin(angle - Math.PI / 6));
    context.lineTo(endX - ARROW_HEAD_SIZE * Math.cos(angle + Math.PI / 6), endY - ARROW_HEAD_SIZE * Math.sin(angle + Math.PI / 6));
    context.closePath();
    context.fill();
}

/**
 * Draws vector information (components, magnitude, angle) on the canvas.
 * @param {CanvasRenderingContext2D} context - The canvas rendering context.
 * @param {number} originX - The x-coordinate of the origin.
 * @param {number} originY - The y-coordinate of the origin.
 * @param {number} ax - The x-component of the vector.
 * @param {number} ay - The y-component of the vector.
 * @param {number} magnitude - The magnitude of the vector.
 * @param {number} angleDeg - The angle of the vector in degrees.
 * @param {number} unitSize - The size of one unit in pixels (PIXELS_PER_UNIT).
 */
function drawVectorInfo(context: CanvasRenderingContext2D, originX: number, originY: number, ax: number, ay: number, magnitude: number, angleDeg: number, unitSize: number): void {
    context.fillStyle = INFO_TEXT_COLOR;
    context.font = "11px Arial";
    context.textAlign = "left"; // Reset alignment

    // Display (Ax, Ay) near the arrowhead
    const endX = originX + ax * unitSize;
    const endY = originY - ay * unitSize; // Canvas Y is inverted

    let textOffsetX = 10; // Default offset to the right
    let textOffsetY = -10; // Default offset upwards

    // Adjust text offset based on quadrant to avoid overlap with vector itself
    if (ax < 0) textOffsetX = -10 - context.measureText(`(Ax: ${ax.toFixed(1)}, Ay: ${ay.toFixed(1)})`).width; // Move left
    if (ay < 0 && ax >=0 ) textOffsetY = 20; // Move down if in Q4 (or on positive Y going down)
    if (ay > 0 && ax < 0) textOffsetY = 20; // Move down if in Q2

    // Special handling for vectors along axes to prevent text from being drawn on top of axis labels
    if (ax === 0 && ay !== 0) { // Vertical vector
        textOffsetX = 5; // Slightly to the right of Y axis
        textOffsetY = ay > 0 ? -10 : 20; // Above or below based on direction
    } else if (ay === 0 && ax !== 0) { // Horizontal vector
        textOffsetY = ax > 0 ? -10 : -10; // Consistently above X-axis
        textOffsetX = ax > 0 ? 5 : -5 - context.measureText(`(Ax: ${ax.toFixed(1)}, Ay: ${ay.toFixed(1)})`).width;
    }


    if (magnitude === 0) {
        context.fillText("(0, 0) at Origin", originX + 5, originY - 5);
    } else {
         context.fillText(`(Ax: ${ax.toFixed(1)}, Ay: ${ay.toFixed(1)})`, endX + textOffsetX, endY + textOffsetY);
    }

    // Display Magnitude and Angle near the origin, ensure it's visible on canvas
    const magText = `Mag: ${magnitude.toFixed(2)}`;
    const angleText = `θ: ${angleDeg.toFixed(1)}°`;

    let infoX = originX + 10;
    let infoYMag = originY + 20;
    let infoYAngle = originY + 35;

    // Adjust if origin is too close to bottom
    if (vectorCanvas && infoYAngle > vectorCanvas.height - 10) {
        infoYMag = originY - 35;
        infoYAngle = originY - 20;
    }
    // Adjust if origin is too close to left (less likely with textAlign = "left")
    if (vectorCanvas && infoX < 10) {
        infoX = 10;
    }
    // Adjust if origin is too close to right (so text is not cut off)
    if (vectorCanvas && infoX + context.measureText(magText).width > vectorCanvas.width - 10) {
       infoX = vectorCanvas.width - 10 - Math.max(context.measureText(magText).width, context.measureText(angleText).width);
    }


    context.fillText(magText, infoX, infoYMag);
    context.fillText(angleText, infoX, infoYAngle);

    // Optionally, draw a small arc for the angle
    if (magnitude > 0) {
        context.beginPath();
        context.strokeStyle = INFO_TEXT_COLOR;
        context.lineWidth = 0.8;
        const arcRadius = Math.min(20, PIXELS_PER_UNIT * 0.8); // Smaller radius for angle arc
        // atan2 gives angle from positive x-axis. Canvas arcs are clockwise.
        // Start angle for arc is 0 (positive x-axis). End angle is -angleRad because canvas y is inverted.
        context.arc(originX, originY, arcRadius, 0, -angleDeg * (Math.PI / 180), angleDeg > 0); // Counter-clockwise if angle is positive
        context.stroke();
    }
}


// Example of how GoogleGenAI could be initialized if needed (not used in current logic)
// const API_KEY = process.env.API_KEY;
// if (!API_KEY) {
//     console.warn("API_KEY environment variable not set. AI features may not work.");
// }
// const ai = new GoogleGenAI({ apiKey: API_KEY });

// async function runGenerativeAiExample() {
//     if (!API_KEY) return;
//     try {
//         // Example: Using a text model
//         const response = await ai.models.generateContent({
//             model: "gemini-2.5-flash-preview-04-17", // Use an appropriate model
//             contents: "Explain vectors in simple terms.",
//         });
//         console.log("AI Response:", response.text);
//     } catch (error) {
//         console.error("Error with Generative AI:", error);
//     }
// }
// runGenerativeAiExample(); // Example call, comment out if not needed
