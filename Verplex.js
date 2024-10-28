// Verplex.js
require('dotenv').config();
const mineflayer = require('mineflayer');
const express = require('express');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const Agent = require('./classes/Agent');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const bot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: process.env.MC_PORT || 25565,
    version: process.env.MC_VERSION || '1.16.5',
    username: process.env.MC_USERNAME,
    password: process.env.MC_PASSWORD,
    keepAlive: true,
    logErrors: true,
    hideErrors: true,
});

// Load pathfinder plugin
bot.loadPlugin(pathfinder);

const MEMORY_FILE = path.join(__dirname, 'botMemory.json');

// Load or initialize memory
let botMemory = { actions: [] };
if (fs.existsSync(MEMORY_FILE)) {
    botMemory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
}

function saveMemory() {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(botMemory));
}

// Function to log actions with categories
function logAction(action, category = 'general') {
    const time = Date.now();
    botMemory.actions.push({ time, action, category });

    // Limit the size of the action history
    if (botMemory.actions.length > 100) {
        botMemory.actions.shift();
    }

    saveMemory();
}

let trainingData = {
    inputs: [],
    outputs: [],
};

bot.on('physicsTick', async () => {
    const nearestEntity = bot.nearestEntity(entity => entity.type === 'player' || entity.type === 'mob');
    const isStationary = bot.entity.velocity.x === 0 && bot.entity.velocity.z === 0;

    if (isStationary && nearestEntity) {
        bot.lookAt(nearestEntity.position.offset(0, nearestEntity.height, 0), true);
        logAction(`Looked at entity: ${nearestEntity.username || nearestEntity.mobType}`, 'observation');

        // Collect data for training
        trainingData.inputs.push([
            bot.entity.position.x, 
            bot.entity.position.y, 
            bot.entity.position.z, 
            bot.entity.velocity.x,
            bot.entity.velocity.z,
        ]);
        trainingData.outputs.push(chooseAction(nearestEntity));

        // Train the model every 100 inputs
        if (trainingData.inputs.length >= 100) {
            await agent.train(trainingData);
            trainingData = { inputs: [], outputs: [] }; // Reset data after training
        }
    }

    // Predict and act
    const inputs = [bot.entity.position.x, bot.entity.position.y, bot.entity.position.z, bot.entity.velocity.x, bot.entity.velocity.z];
    const action = agent.predict(inputs);
    performAction(action);
});

bot.once('spawn', async () => {
    console.log('VerplexVore has spawned and is ready for exploration.');

    // Setup default movement after bot has spawned
    const defaultMovements = new Movements(bot);
    bot.pathfinder.setMovements(defaultMovements);

    // Initialize agent with AI neural network logic
    const agent = new Agent(bot);
    // Load model if exists
    if (fs.existsSync(path.join(__dirname, 'model'))) {
        await agent.loadModel(path.join(__dirname, 'model'));
    } else {
        console.log('No model found. Starting with a new model.');
    }
});

// Function to choose action based on nearest entity
function chooseAction(entity) {
    // Define possible actions
    const actions = [0, 0, 0]; // Assuming 3 actions: move, attack, idle
    // Implement your action logic here based on the entity's properties
    // For example, if the entity is a player, choose to attack
    if (entity.type === 'player') {
        actions[1] = 1; // Attack
    } else {
        actions[0] = 1; // Move towards
    }
    return actions;
}

// Function to perform an action based on predictions
function performAction(action) {
    const actionIndex = action.indexOf(Math.max(...action)); // Get the index of the highest predicted action
    switch (actionIndex) {
        case 0: // Move towards
            // Add movement logic here, e.g., bot.pathfinder.goto(...)
            break;
        case 1: // Attack
            // Add attack logic here, e.g., bot.attack(nearestEntity)
            break;
        case 2: // Idle
            // The bot does nothing
            break;
        default:
            console.log('No valid action predicted.');
    }
}
