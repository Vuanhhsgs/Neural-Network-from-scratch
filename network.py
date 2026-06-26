import numpy as np

# ===================================================
# PLACE YOUR NEURAL NETWORK CLASS AND MATH HERE
# Paste your initialization, backpropagation, and 
# layer updates below.
# ===================================================

# Global variable keeps the model instance in memory
trained_model_instance = None

def trigger_training(hidden_layers, learning_rate, dropout_rate, epochs):
    """
    This function runs when the user clicks 'Train Model'.
    It receives the architecture inputs directly from the web panel.
    """
    global trained_model_instance
    
    # Convert incoming browser array to a standard list
    layers_list = list(hidden_layers)
    
    # ------------------------------------------------
    # YOUR CODE GOES HERE
    # Initialize your weights using layers_list.
    # Run your training loops with learning_rate, 
    # dropout_rate, and epochs.
    # ------------------------------------------------
    
    # Sample calculation result to display on the panel
    calculated_accuracy = 95.2
    return calculated_accuracy

def trigger_prediction(flat_image_pixels):
    """
    This function runs when the user clicks 'Predict Number'.
    It receives a flat list of 784 pixel values between 0 and 255.
    """
    global trained_model_instance
    
    # Format incoming data to match typical network input shapes
    img_array = np.array(flat_image_pixels, dtype=np.float32).reshape(1, 784) / 255.0
    
    # ------------------------------------------------
    # YOUR FORWARD PASS PREDICTION CODE GOES HERE
    # Run your dot products and return the final index.
    # ------------------------------------------------
    
    return 7
