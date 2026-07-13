from http import cookiejar
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

test_X = np.load("./mnist_data/test_X.npy").astype(np.float32) / 255.0
test_Y = np.load(os.path.join("./mnist_data", "test_Y.npy"))

train_X = train_X.T  #now it's a R^{d * training_size} matrix with d being the dimension of each X
test_X = test_X.T


import asyncio
import json
import websockets
import concurrent.futures
#hellos
test_X = np.load(os.path.join("./mnist_data", "test_X.npy")).astype(np.float32) / 255.0

test_X = test_X.T
test_Y = np.load(os.path.join("./mnist_data", "test_Y.npy"))

#Normalize training data(mean = 0 std = 1)
mean_ith_features = np.mean(train_X, axis=1, keepdims=True)
std_ith_features = np.std(train_X, axis=1, keepdims=True)
std_ith_features[std_ith_features == 0] = 1 #prevent divide by 0

train_X -= mean_ith_features
train_X /= std_ith_features


#Normalize test data similarly
test_X -= mean_ith_features
test_X /= std_ith_features


import threading 
async def safe_send(socket, msg):
    async with socket.send_lock:
        await socket.send(msg)
async def socket_handler(socket):
    socket.send_lock = asyncio.Lock()
    socket_closed = threading.Event() #a flag to check whether socket is closed or not
    training_cancelled = threading.Event() #a flag to check if training is requested to cancelled from an user
    try:
        async for message in socket:
            data = json.loads(message)
            if data.get("message_type") == "TRAINING_CONFIG":
                training_cancelled.clear()
                await training_queue.put({"socket": socket, "data": data.get("message_content"), "socket_closed": socket_closed, "training_cancelled": training_cancelled})
                await safe_send(socket, json.dumps({"type": "TRAINING_QUEUED"}))
            if data.get("message_type") == "DIGIT_DATA":
                digit_data = data.get("message_content")
                predicted_digit = await Predict_digit(digit_data, socket.model_weights, socket.model_bias)
                await safe_send(socket, json.dumps({"type": "PREDICT_FINISHED", "content": predicted_digit}))
            if data.get("message_type") == "CANCEL_TRAINING":
                training_cancelled.set()


    except websockets.exceptions.ConnectionClosed:
        socket_closed.set()
    
max_concurrent_thread = 2
            
training_queue = asyncio.Queue()
thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=max_concurrent_thread)

async def modelTraining_task():
    main_event_loop = asyncio.get_running_loop()

    while True:
        training_request = await training_queue.get()
        socket = training_request["socket"]
        training_data = training_request["data"]
        socket_closed = training_request["socket_closed"]
        training_cancelled = training_request["training_cancelled"]
        if socket_closed.is_set() or training_cancelled.is_set():
            training_queue.task_done()
            try:
                await safe_send(socket, json.dumps({ "type": "TRAINING_CANCELLED" }))
                continue
            except:
                continue
        await safe_send(socket, json.dumps({"type": "TRAINING_STARTED"}))

        layers = training_data.get("layers")
        network_structure = []     #it will look sth like [784 512 512 512 256 256 10] for example 
        for layer in layers:
            for i in range(layer["width"]):
                network_structure.append(layer["size"]) 
                
        #weight and parameter initialization
        model_bias = []
        model_weights = []
        for i in range(1, len(network_structure)):
            # B is column vector: M = W * H + B
            model_bias.append(np.full((network_structure[i], 1), 0.01))
            initial_weight = np.random.randn(network_structure[i], network_structure[i-1]) * math.sqrt(2/network_structure[i-1]) #best weight intialization for ReLU: distribution of element of weight matrix is normal with variance of sqrt(2/previous_layer)
            model_weights.append(initial_weight)
        epochs = training_data.get("epochs")
        was_cancelled = False
        for epoch in range(epochs):
            if socket_closed.is_set():
                break
            if training_cancelled.is_set():
                was_cancelled = True
                break

            model_weights, model_bias, avg_loss, accuracy = await main_event_loop.run_in_executor(
                thread_pool,
                train_model_one_epoch,
                training_data,
                model_weights,
                model_bias
            )    
            await asyncio.sleep(0.05)
            if socket_closed.is_set():
                break
            if training_cancelled.is_set():
                was_cancelled = True
                break
            await safe_send(socket, json.dumps({"type": "LOSS_UPDATE", "content": {"epoch": epoch+1, "loss": float(avg_loss)}}))
            await safe_send(socket, json.dumps({"type": "ACCURACY_UPDATE", "content": {"epoch": epoch+1, "acc": float(accuracy)}}))
            
        if was_cancelled:
            await safe_send(socket, json.dumps({"type": "TRAINING_CANCELLED"}))

        elif not socket_closed.is_set():
            socket.model_weights = model_weights
            socket.model_bias = model_bias

            socket.model_weights = model_weights
            socket.model_bias = model_bias
            await safe_send(socket, json.dumps({"type": "TRAINING_FINISHED"}))
            
        training_queue.task_done()           
               


async def main():
    for i in range(max_concurrent_thread):
        asyncio.create_task(modelTraining_task())
    async with websockets.serve(socket_handler,"0.0.0.0", 6767):
        await asyncio.Future()





async def Predict_digit(digit_data, trained_model_weights, trained_model_bias):
    digit_array = np.array(digit_data).astype(np.float32)

    #Normalize prediction data identically to training data
    digit_array = digit_array.reshape(784, 1)
    epsilon = 1e-8
    test_H = (digit_array - mean_ith_features) / (std_ith_features + epsilon)
    
    #Feedforward logic
    for k in range(len(trained_model_weights)-1):
        M = trained_model_weights[k] @ test_H + trained_model_bias[k]
        test_H = np.maximum(0, M)
        
    final_M = trained_model_weights[-1] @ test_H + trained_model_bias[-1]
    
    predicted_digit = int(np.argmax(final_M))
    return predicted_digit

import time  
def train_model_one_epoch(training_data, model_weights, model_bias):
    train_size = int(training_data.get("trainSize"))
    batchSize = int(training_data.get("batchSize"))
    dropout_enabled = training_data.get("dropout_enabled")
    dropout_rate = training_data.get("dropout_rate")
    regularization_enabled = training_data.get("regularization_enabled")
    regularization_parameter = training_data.get("regularization_parameter")
    layers = training_data.get("layers")
    learningRate = training_data.get("learningRate")    

    #Start training

    number_of_batches = math.ceil(train_size / batchSize)
    

    random_index = np.random.permutation(train_size)
    this_train_X = train_X[:, random_index]
    this_train_Y = train_Y[random_index]
    
    epoch_total_loss = 0

    for j in range(0, batchSize*number_of_batches, batchSize):
        if(j >= train_size):
            break
            
        if(j + batchSize >= train_size):
            batch_matrix_X = this_train_X[:, j:]
            batch_Y = this_train_Y[j:]
            true_batchSize = train_size - j
        else:
            batch_matrix_X = this_train_X[:, j:j+batchSize]
            batch_Y = this_train_Y[j:j+batchSize]
            true_batchSize = batchSize
            
        #sum of W_{i,j}^2
        L2_total_weight = 0
        if regularization_enabled:
            for W in model_weights:
                L2_total_weight += np.sum(np.square(W))

        this_batch_M = [] 
        this_batch_N = []
        this_batch_H = [] #Hidden layer
        this_batch_dropout = [] # dropout matrix consisting of 0 and 1
        
        first_M = model_weights[0] @ batch_matrix_X + model_bias[0] #M_0 = W_0X + B_0; X,M,W lies in R^{d*B}, R^{k*B}, R^{k*d} 
        this_batch_M.append(first_M)

        first_N = np.maximum(0, first_M) # N = ReLu(M)
        this_batch_N.append(first_N)
        
        if dropout_enabled:
            rng = np.random.default_rng()
            dropout_matrix = rng.choice([0,1], size = first_N.shape, p = [dropout_rate, 1-dropout_rate]) 
            this_batch_dropout.append(dropout_matrix)
            first_H = first_N * dropout_matrix   # H_0 = Dropout(N_0)
            first_H *= 1/(1-dropout_rate)               
        else:
            this_batch_dropout.append(np.ones(first_N.shape))
            first_H = first_N

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
            
            if dropout_enabled:
                rng = np.random.default_rng()
                dropout_matrix = rng.choice([0,1], size = N.shape, p = [dropout_rate, 1-dropout_rate]) 
                this_batch_dropout.append(dropout_matrix)
                H = dropout_matrix * N  
                H *= 1/(1-dropout_rate)
            else: 
                this_batch_dropout.append(np.ones(N.shape))
                H = N
            this_batch_H.append(H)

        #from H_{n-1} to calculating loss function:
        #the last layer are: M_n = W_n * H_(n-1) + B_n, and note that len(model_weights) = n+1  
        W_n = model_weights[-1]   
        H_n_minus_1 = this_batch_H[-1]
        B_n =  model_bias[-1]
        last_M = W_n @ H_n_minus_1 + B_n
        
        #Stabilization to prevent overflow
        last_M_shifted = last_M - np.max(last_M, axis=0)
        exp_M = np.exp(last_M_shifted)
        predicted_Y = exp_M / exp_M.sum(axis=0) #predicted_Y = softmax(M)

        
        Loss = 0
        for i in range(true_batchSize): #0 to B-1 since batch_Y lies in R^{1*B}
            true_digit = batch_Y[i] #0 to 9
            Loss -= np.log( predicted_Y[true_digit, i] + 1e-9 )
                #cross entropy loss and we need that epsilon value in case predicted_Y[true_Y, batch_index] = 0 
        
        Loss /= true_batchSize  # L = 1/B(sum of -log(predited_Y_i))
        if regularization_enabled:
            Loss += L2_total_weight * regularization_parameter
        epoch_total_loss += Loss


        #Backpropagation and update model parameters 
        
        #calculate dL/dM_last
        dL_dM = np.copy(predicted_Y)
        for i in range(true_batchSize):
            dL_dM[batch_Y[i], i] -= 1
        dL_dM /= true_batchSize

        dL_dW = []
        dL_dB = []

        #calculate dl/dW and dL/dB based on dL/dM
        dL_dW.append(dL_dM @ H_n_minus_1.T)
        dL_dB.append(np.sum(dL_dM, axis=1, keepdims=True)) #dL/dB = sum of all (dL/dM)_{i,j}

        #calculate dL/dH based on dL/dM
        dL_dH = W_n.T @ dL_dM

        #Backprogating through hidden layers
        for k in range(len(model_weights)-2, -1, -1):
            # Calculate dL/dN
            if dropout_enabled:
                # H = element_wise_multiplication(N, dropout_matrix) * 1/(1-dropout_rate) then
                # dL/dN = element_wise_multiplication(dL/dH, dropout_matrix)* 1/(1-dropout_rate)
                dL_dN = dL_dH * this_batch_dropout[k] * (1 / (1 - dropout_rate))
            else:
                dL_dN = dL_dH
                
            #Calculate dL/dM based on dL/dN
            dL_dM_k = dL_dN * (this_batch_M[k] > 0) #N = ReLu(M)
            
            #the previous hidden layer could either be a hidden layer or input matrix X
            if k > 0:
                H_prev = this_batch_H[k-1]
            else:
                H_prev = batch_matrix_X
                
            #Calculate dL/dW and dL/db
            dL_dW.insert(0, dL_dM_k @ H_prev.T)
            dL_dB.insert(0, np.sum(dL_dM_k, axis=1, keepdims=True))
            
            #Calculate dL/dH based on dL/dM
            if k > 0: #otherwise if k=0 we don't need to calculate dL/dX
                dL_dH = model_weights[k].T @ dL_dM_k

        #update W and b with gradient descent based on dL/dW and dL/dB
        for k in range(len(model_weights)):
            if regularization_enabled:
                dL_dW[k] += 2 * regularization_parameter * model_weights[k] #derivative of regularlization part 
                
            model_weights[k] -= learningRate * dL_dW[k]
            model_bias[k] -= learningRate * dL_dB[k]
            batch_index = j // batchSize
    #End epoch and caculate avg loss
    avg_loss = epoch_total_loss / number_of_batches
    
    
    #Test the newly updated weight on test_X and test_Y then send this data back to browser
    test_batchSize = test_X.shape[1]
    test_H = test_X
    for k in range(len(model_weights)-1):
        M = model_weights[k] @ test_H + model_bias[k]
        test_H = np.maximum(0, M)
        
        
    final_M = model_weights[-1] @ test_H + model_bias[-1]
    predicted_test_Y = np.argmax(final_M, axis=0)
    
    correct_predictions = np.sum(predicted_test_Y == test_Y)
    accuracy = (correct_predictions / test_batchSize) * 100
    


    return model_weights, model_bias, avg_loss, accuracy

if __name__ == "__main__":
    asyncio.run(main())
