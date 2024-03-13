/*
 * SPDX-License-Identifier: Apache-2.0
 */
// Deterministic JSON.stringify()
import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import * as tf from '@tensorflow/tfjs-node';

@Info({title: 'AssetTransfer', description: 'Smart contract for trading assets'})
export class AssetTransferContract extends Contract {

    // CreateAsset issues a new asset to the world state with given details.
    @Transaction()
    public async CreateAsset(ctx: Context, sepal_length: number, sepal_width: number, petal_length: number, petal_width: number, species: number): Promise<string> {
        const id = sepal_length + "_" + sepal_width + "_" + petal_length + "_" + petal_width + "_" + species
        // const exists = await this.AssetExists(ctx, id);
        // if (exists) {
        //     throw new Error(`The asset ${id} already exists`);
        // }

        const asset = {
            sepal_length: sepal_length,
            sepal_width: sepal_width,
            petal_length: petal_length,
            petal_width: petal_width,
            species: species,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }
    
    // Train model
    @Transaction()
    async TrainModel(ctx: Context): Promise<void>  {
        const dataJSON = await this.GetAllAssets(ctx);
        const data = JSON.parse(dataJSON)
        const mappedData = data.map((row) => ({
            sepal_length: parseFloat(row.sepal_length),
            sepal_width: parseFloat(row.sepal_width),
            petal_length: parseFloat(row.petal_length),
            petal_width: parseFloat(row.petal_width),
            species: parseFloat(row.species),
        }));
        console.log(mappedData);

        const xs = tf.tensor(mappedData.map((item) => [item.sepal_length, item.sepal_width, item.petal_length, item.petal_width]));
        const labels = tf.oneHot(mappedData.map((item) => item.species), 3);
        
        const model = await this.createModel();

        // Train the model
        await model.fit(xs, labels, {
          epochs: 200,
          batchSize: 5,
          validationSplit: 0.2,
          callbacks: tf.node.tensorBoard('/tmp/iris_logs'),
        });

        const modelConfig = model.toJSON();
        await ctx.stub.putState("modelConfig", Buffer.from(modelConfig));
        const modelWeights = model.getWeights();
        const modelWeightsArray = []
        for (const weightTensor of modelWeights) {
            const weightTensorData = await weightTensor.data()
            const tensorObject = {data: Array.from(weightTensorData), shape: weightTensor.shape}
            const tensorJSON = JSON.stringify(tensorObject)
            modelWeightsArray.push(tensorJSON)
        }

        const modelWeightsJSON = JSON.stringify({ weights: modelWeightsArray})
        await ctx.stub.putState("modelWeights", Buffer.from(modelWeightsJSON));
    }    

    async createModel() {
        const model = tf.sequential();
      
        model.add(tf.layers.dense({ inputShape: [4], units: 10, activation: 'relu', kernelInitializer: 'glorotNormal' }));
        model.add(tf.layers.dense({ units: 10, activation: 'relu', kernelInitializer: 'glorotNormal' }));
        // model.add(tf.layers.dense({ units: 3, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.2 })}));
        model.add(tf.layers.dropout({ rate: 0.3 }));
        model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
      
        model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy'],
        });
      
        return model;
    }

    // ReadAsset returns the asset stored in the world state with given id.
    @Transaction(false)
    public async ReadAsset(ctx: Context, id: string): Promise<string> {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // Rebuild the neural network and predict according to input
    @Transaction(false)
    public async modelPredict(ctx: Context, sepal_length: number, sepal_width: number, petal_length: number, petal_width: number): Promise<string> {
        const modelConfigBuffer = await ctx.stub.getState("modelConfig"); // get the model topography from chaincode state
        if (!modelConfigBuffer || modelConfigBuffer.length === 0) {
            throw new Error(`Any model has yet to be trained`);
        }
        const modelWeightsBuffer = await ctx.stub.getState("modelWeights");
        const modelConfigJSON = modelConfigBuffer.toString();
        const modelWeightsJSON = modelWeightsBuffer.toString();
        
        const reconstructedModelWeights = []
        const modelWeightsArray = (JSON.parse(modelWeightsJSON)).weights;
        for (const weightTensor of modelWeightsArray) {
            let reconstructedTensorObject = {data: new Float32Array((JSON.parse(weightTensor)).data), shape: (JSON.parse(weightTensor)).shape }
            let reconstructedTensor = tf.tensor(reconstructedTensorObject.data, reconstructedTensorObject.shape)
            reconstructedModelWeights.push(reconstructedTensor);
        }

        const restoredModel = await tf.models.modelFromJSON(JSON.parse(modelConfigJSON))
        restoredModel.setWeights(reconstructedModelWeights);
        const testVal = tf.tensor2d([sepal_length, sepal_width, petal_length, petal_width], [1, 4]);
        const prediction = restoredModel.predict(testVal);
        const pIndex = tf.argMax(prediction as tf.Tensor, 1).dataSync();
        const classNames = ["Setosa", "Versicolor", "Virginica"];
        return classNames[pIndex[0]];
    }    

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    @Transaction()
    public async UpdateAsset(ctx: Context, sepal_length: number, sepal_width: number, petal_length: number, petal_width: number, species: number): Promise<void> {
        const id = sepal_length + "_" + sepal_width + "_" + petal_length + "_" + petal_width + "_" + species
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            sepal_length: sepal_length,
            sepal_width: sepal_width,
            petal_length: petal_length,
            petal_width: petal_width,
            species: species,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    // DeleteAsset deletes an given asset from the world state.
    @Transaction()
    public async DeleteAsset(ctx: Context, id: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // GetAllAssets returns all assets found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllAssets(ctx: Context): Promise<string> {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            if ( "modelConfig" == (result.value.key.toString()) || "modelWeights" == (result.value.key.toString())) {
                result = await iterator.next();
                continue;
            }
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

}
9