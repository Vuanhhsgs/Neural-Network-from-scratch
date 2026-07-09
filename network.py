from asyncio import exceptions
from asyncio import base_events
import asyncio

import os
import urllib.request
import gzip
import struct
import numpy as np
import math

"""
PROCESS MNIST data

BASE_URL = "https://storage.googleapis.com/cvdf-datasets/mnist/"
FILES = {
    "train_x": "train-images-idx3-ubyte.gz",
    "train_y": "train-labels-idx1-ubyte.gz",
    "test_x": "t10k-images-idx3-ubyte.gz",
    "test_y": "t10k-labels-idx1-ubyte.gz",
}
DATA_DIR = "./mnist_data"

def download_mnist():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    for filename in FILES.values():
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            url = BASE_URL + filename
            urllib.request.urlretrieve(url, filepath)

def load_images(filepath):
    with gzip.open(filepath, "rb") as f:
        magic, num_images, rows, cols = struct.unpack(">IIII", f.read(16))
        raw_pixel_buffer = f.read()
        images = np.frombuffer(raw_pixel_buffer, dtype=np.uint8)
        # CHANGED: Keep it as uint8 here so the saved file stays small
        images = images.reshape(num_images, rows * cols)
        return images

def load_labels(filepath):
    with gzip.open(filepath, "rb") as f:
        magic, num_labels = struct.unpack(">II", f.read(8))
        raw_label_buffer = f.read()
        labels = np.frombuffer(raw_label_buffer, dtype=np.uint8)
        return labels

def get_mnist_data():
    download_mnist()
    train_X = load_images(os.path.join(DATA_DIR, FILES["train_x"]))
    train_Y = load_labels(os.path.join(DATA_DIR, FILES["train_y"]))
    test_X = load_images(os.path.join(DATA_DIR, FILES["test_x"]))
    test_Y = load_labels(os.path.join(DATA_DIR, FILES["test_y"]))
    return train_X, train_Y, test_X, test_Y

# 1. Run the extraction and save the lightweight uint8 arrays
train_X, train_Y, test_X, test_Y = get_mnist_data()

np.save(os.path.join(DATA_DIR, "train_X.npy"), train_X)
np.save(os.path.join(DATA_DIR, "train_Y.npy"), train_Y)
np.save(os.path.join(DATA_DIR, "test_X.npy"), test_X)
np.save(os.path.join(DATA_DIR, "test_Y.npy"), test_Y)
"""

train_X = np.load("./mnist_data/train_X.npy").astype(np.float32) / 255.0
train_Y = np.load(os.path.join("./mnist_data", "train_Y.npy")) #[9,3,2,0,...] being digits from 0 to 9

train_X = train_X.T  #now it's a R^{d * training_size} matrix with d being the dimension of each X

train_size = train_X.shape[1]

test_X = np.load(os.path.join("./mnist_data", "test_X.npy"))
test_Y = np.load(os.path.join("./mnist_data", "test_Y.npy"))
#Normalize training data
mean_ith_features = []
std_ith_features = []
for i in range(784):
    mean_ith_features.append(np.mean(train_X[i])) 
    std_ith_features.append(np.std(train_X[i]))
for i in range(784):
    for j in range(len(train_X[i])):
        train_X[i][j] = (train_X[i][j]-mean_ith_features[i])/std_ith_features






"""


import asyncio
import json
import websockets
training_queue = asyncio.queue()
async def socket_handler(socket):
    try:
        async for message in socket:
            data = json.loads(message)
            if data.get("message_type") == "TRAINING_CONFIG":
                await training_queue.push({"socket": socket, "data": data.get("message_content")})
            if data.get("message_type") == "DIGIT_DATA":
                digit_data = data.get("message_content")
                predicted_digit = Predict_digit(digit_data)
                socket.send(json.dumps({"type": "PREDICT_FINISHED", "content": predicted_digit}))
            
async def modelTraining_task():
    while True:
        training_request = await training_queue.get()
        socket = training_queue.get("socket")
        training_data = training_queue.get("data")
        await train_model(socket, training_data) #In this function we will send the model accuracy after every epoch
        socket.send(json.dumps({"type": "TRAINING_FINISHED"}))
               


async def main():
    asyncio.create_task(modelTraining_task())
    async with websockets.serve(socket_handler,"0.0.0.0", 6767):
        await asyncio.future()

def train_model(socket, training_data):
    epochs = training_data.get("epochs")
    batchSize = training_data.get("batchSize")
    dropout_enabled = training_data.get("dropout_enabled")
    dropout_rate = training_data.get("dropout_rate")
    regularization_enabled = training_data.get("regularization_enabled")
    regularization_parameter = training_data.get("regularization_parameter")
    layers = training_data.get("layers")
    learningRate = training_data.get("learningRate")    

    #Start training

    network_structure = []     #it will look sth like [784 512 512 512 256 256 10] for example 
    for layer in layers.key():
        for i in layer["width"]:
            network_structure.append(layer["size"]) 
    #weight and parameter initialization
    model_bias = np.full(len(network_structure)-1, 0.01)

    model_weights = []
    for i in range(1, len(network_structure)):
        initial_weight = math.random.randn(network_structure[i], network_structure[i-1]) * math.sqrt(2/network_structure[i-1])
        model_weights.append(initial_weight)
    model_weights = np.array(model_weights)


    #start training 
    number_of_batches = math.ceil(train_size / batchSize)
    
    for i in epochs:
        #hidden layer in feedforward part

        #sample data        
        random_index = np.random.permutation(len(train_X[0]))
        this_train_X = train_X[:, random_index]
        this_train_Y = train_Y[:, random_index]

        for j in range(0, batchSize*number_of_batches, batchSize):
            if(j == batchSize*(number_of_batches-1)):
                batch_matrix_X = this_train_X[:, j:]
                batch_Y = this_train_Y[:, j:]
                true_batchSize = train_size - j
            else:
                batch_matrix_X = train_X[:, j:j+batchSize]
                batch_Y = this_train_Y[:, j:j+batchSize]
                true_batchSize = batchSize
            this_batch_M = [] 
            this_batch_N = []
            this_batch_H = [] #Hidden layer
            first_M = model_weights[0] @ batch_matrix_X + model_bias[0] #M_0 = W_0X + B_0; X,M,W lies in R^{d*B}, R^{k*B}, R^{k*d} 
            this_batch_M.append(first_M)

            first_N = np.maximum(0, M) # N = ReLu(M)
            this_batch_N.append(first_N)

            rng = np.random.default_rng()
            dropout_matrix  = rng.choice([0,1], size = first_N.shape, p = [dropout_rate, 1-dropout_rate]) 
            first_H = first_N * dropout_matrix   # H_0 = Dropout(N_0)
            first_H *= 1/(1-dropout_rate)
            this_batch_H.append(first_H)
            
            # W_0 lies in R^{k*d}, X lies in R^{d*B} then B_0 lies in R^{k*B}
            #M0 = W0X + B0 , then N_0 = ReLu(M_0), H_0 = Dropout(N_0)
            #then M1 = W1H0 + B1, M2 = W2H1 + B2, M3 = W3H2 + B3 for example
            #until M_n = W_n * H_(n-1) + B_n which is the last layer hence we compute loss based on H_n
            # model_weights = n+1 hence we only apply the loop: H_{i+1} = dropout(ReLu(W_{i+1}*H_i + B_{i+1}))
            # with i ranging from 0 to n-2. Notice that n-2 = model_weights - 3

            for k in range(0, len(model_weights)-2):
                M = model_weights[k+1] @ this_batch_H[k] + model_bias[k+1]
                this_batch_M.append(M)
                N = np.maximum(M,0)
                this_batch_N.append(N)
                dropout_matrix = rng.choice([0,1], size = first_N.shape, p = [dropout_rate, 1-dropout_rate]) 
                H = dropout_matrix * N  
                H *= 1/(1-dropout_rate)
                this_batch_H.append(H)
            this_batch_M = np.vectorize(this_batch_M) #this_batch_M :[M0, M1, ..., M_{n-1}]
            this_batch_N = np.vectorize(this_batch_N) #this_batch_N :[N0, N1, ..., N_{n-1}]
            this_batch_H = np.vectorize(this_batch_H) #this_batch_H :[H0, H1, ..., H_{n-1}]


            #from H_{n-1} to calculating loss function:
            #the last layer are: M_n = W_n * H_(n-1) + B_n, and note that len(model_weights) = n+1  
            W_n = model_weights[len(model_weights)-1]   
            H_n_minus_1 = this_batch_H[len(model_weights)-2]
            B_n =  model_bias[len(model_weights)-1]
            last_M = W_n @ H_n_minus_1 + B_n





         

            



        



        
    


if __name__ == "__main__":
    asyncio.run(main())

async def Predict_digit(digit_data):
    return 67
"""