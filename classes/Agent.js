// Agent.js
const tf = require('@tensorflow/tfjs-node');

class Agent {
    constructor(bot) {
        this.bot = bot;
        this.model = this.createModel();
    }

    createModel() {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [this.inputShape()] }));
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 3, activation: 'softmax' })); // Change units based on actions

        model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy' });
        return model;
    }

    inputShape() {
        return 5; // Adjust based on the number of features
    }

    async train(data) {
        const xs = tf.tensor2d(data.inputs);
        const ys = tf.tensor2d(data.outputs);

        await this.model.fit(xs, ys, {
            epochs: 100, // Adjust based on your needs
            verbose: 1,
        });

        xs.dispose();
        ys.dispose();
    }

    predict(inputs) {
        const inputTensor = tf.tensor2d([inputs]);
        const prediction = this.model.predict(inputTensor).dataSync();
        return prediction; // Returns the predicted actions
    }

    saveModel(path) {
        return this.model.save(`file://${path}`);
    }

    async loadModel(path) {
        this.model = await tf.loadLayersModel(`file://${path}/model.json`);
    }
}

module.exports = Agent;
