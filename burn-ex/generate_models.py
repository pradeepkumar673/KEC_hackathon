import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPRegressor
import json
import os

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    import tensorflowjs as tfjs
    USE_TF = True
    print("Using TensorFlow to train and export models.")
except ImportError:
    USE_TF = False
    print("TensorFlow/tensorflowjs not installed. Using fallback scikit-learn MLPRegressor to generate TF.js-compatible models.")

# Target directories
CAL_DIR = 'frontend/public/models/calorie_model'
FORM_DIR = 'frontend/public/models/form_model'

os.makedirs(CAL_DIR, exist_ok=True)
os.makedirs(FORM_DIR, exist_ok=True)

# 1. Generate calorie data
def generate_calorie_data(n=5000):
    np.random.seed(42)
    weight = np.random.uniform(50, 120, n)
    reps_per_min = np.random.uniform(5, 30, n)
    form_score = np.random.uniform(50, 100, n)
    met = np.random.choice([5.0, 8.0], n)
    duration_hours = np.random.uniform(0.05, 0.5, n)

    true_mult = 1.0 + 0.01 * reps_per_min + 0.002 * (form_score - 70)
    true_mult = np.clip(true_mult, 0.8, 1.3)
    true_mult += np.random.normal(0, 0.02, n)
    true_mult = np.clip(true_mult, 0.75, 1.35)

    X = np.column_stack([weight, reps_per_min, form_score, met, duration_hours])
    y = true_mult
    return X, y

X_cal, y_cal = generate_calorie_data()
X_cal_train, X_cal_test, y_cal_train, y_cal_test = train_test_split(X_cal, y_cal, test_size=0.2, random_state=42)

scaler_cal = StandardScaler()
X_cal_train_scaled = scaler_cal.fit_transform(X_cal_train)
X_cal_test_scaled = scaler_cal.transform(X_cal_test)

# 2. Generate form data
def generate_form_data(n=5000):
    np.random.seed(123)
    X = []
    y = []
    for _ in range(n):
        landmarks = np.random.uniform(0, 1, (33, 3))
        score = 70 + 20 * np.sin(landmarks[0,0] * 10) + 10 * np.cos(landmarks[1,1] * 8)
        score = np.clip(score, 10, 100)
        X.append(landmarks.flatten())
        y.append(score / 100.0)
    return np.array(X), np.array(y)

X_form, y_form = generate_form_data()
X_form_train, X_form_test, y_form_train, y_form_test = train_test_split(X_form, y_form, test_size=0.2, random_state=42)

scaler_form = StandardScaler()
X_form_train_scaled = scaler_form.fit_transform(X_form_train)
X_form_test_scaled = scaler_form.transform(X_form_test)

# Save scalers
with open(os.path.join(CAL_DIR, 'scaler.json'), 'w') as f:
    json.dump({'mean': scaler_cal.mean_.tolist(), 'scale': scaler_cal.scale_.tolist()}, f)

with open(os.path.join(FORM_DIR, 'scaler.json'), 'w') as f:
    json.dump({'mean': scaler_form.mean_.tolist(), 'scale': scaler_form.scale_.tolist()}, f)

if USE_TF:
    # Train and export Calorie Model using Keras/TFJS
    cal_model = keras.Sequential([
        layers.Dense(32, activation='relu', input_shape=(5,)),
        layers.Dense(16, activation='relu'),
        layers.Dense(1, activation='sigmoid')
    ])
    cal_model.compile(optimizer='adam', loss='mse')
    cal_model.fit(X_cal_train_scaled, (y_cal_train - 0.8) / 0.5, epochs=30, batch_size=32, verbose=1)
    tfjs.converters.save_keras_model(cal_model, CAL_DIR)

    # Train and export Form Model using Keras/TFJS
    form_model = keras.Sequential([
        layers.Dense(64, activation='relu', input_shape=(99,)),
        layers.Dense(32, activation='relu'),
        layers.Dense(1, activation='sigmoid')
    ])
    form_model.compile(optimizer='adam', loss='mse')
    form_model.fit(X_form_train_scaled, y_form_train, epochs=20, batch_size=64, verbose=1)
    tfjs.converters.save_keras_model(form_model, FORM_DIR)
else:
    # Helper to export MLPRegressor weights to TF.js layers format
    def export_mlp_to_tfjs(mlp, input_dim, hidden_dims, output_dir):
        binary_data = b""
        weights_info = []
        
        for i in range(len(mlp.coefs_)):
            w = mlp.coefs_[i].astype(np.float32)
            b = mlp.intercepts_[i].astype(np.float32)
            
            binary_data += w.tobytes()
            binary_data += b.tobytes()
            
            layer_name = f"dense" if i == 0 else f"dense_{i}"
            weights_info.append({"name": f"{layer_name}/kernel", "shape": list(w.shape), "dtype": "float32"})
            weights_info.append({"name": f"{layer_name}/bias", "shape": list(b.shape), "dtype": "float32"})
            
        with open(os.path.join(output_dir, "group1-shard1of1.bin"), "wb") as f:
            f.write(binary_data)
            
        layers_config = [
            {
                "class_name": "InputLayer",
                "config": {
                    "batch_input_shape": [None, input_dim],
                    "dtype": "float32",
                    "sparse": False,
                    "name": "input_layer"
                }
            }
        ]
        
        for i, h_dim in enumerate(hidden_dims):
            layer_name = f"dense" if i == 0 else f"dense_{i}"
            layers_config.append({
                "class_name": "Dense",
                "config": {
                    "name": layer_name,
                    "trainable": True,
                    "dtype": "float32",
                    "units": h_dim,
                    "activation": "relu",
                    "use_bias": True,
                    "kernel_initializer": {"class_name": "GlorotUniform", "config": {"seed": None}},
                    "bias_initializer": {"class_name": "Zeros", "config": {}},
                    "kernel_regularizer": None,
                    "bias_regularizer": None,
                    "activity_regularizer": None,
                    "kernel_constraint": None,
                    "bias_constraint": None
                }
            })
            
        out_layer_name = f"dense_{len(hidden_dims)}"
        layers_config.append({
            "class_name": "Dense",
            "config": {
                "name": out_layer_name,
                "trainable": True,
                "dtype": "float32",
                "units": 1,
                "activation": "sigmoid",
                "use_bias": True,
                "kernel_initializer": {"class_name": "GlorotUniform", "config": {"seed": None}},
                "bias_initializer": {"class_name": "Zeros", "config": {}},
                "kernel_regularizer": None,
                "bias_regularizer": None,
                "activity_regularizer": None,
                "kernel_constraint": None,
                "bias_constraint": None
            }
        })
        
        model_json = {
            "format": "layers-model",
            "generatedBy": "keras v3.15.0",
            "convertedBy": "TensorFlow.js Converter v4.22.0",
            "modelTopology": {
                "class_name": "Sequential",
                "config": {
                    "name": "sequential",
                    "layers": layers_config
                },
                "keras_version": "3.15.0",
                "backend": "tensorflow"
            },
            "weightsManifest": [
                {
                    "paths": ["group1-shard1of1.bin"],
                    "weights": weights_info
                }
            ]
        }
        
        with open(os.path.join(output_dir, "model.json"), "w") as f:
            json.dump(model_json, f, indent=2)

    # Train Calorie Multiplier with MLPRegressor
    y_cal_scaled = (y_cal_train - 0.8) / 0.5
    y_cal_scaled = np.clip(y_cal_scaled, 0.001, 0.999)
    y_cal_logit = np.log(y_cal_scaled / (1.0 - y_cal_scaled))
    
    print("Training Calorie Multiplier model with scikit-learn MLPRegressor...")
    cal_mlp = MLPRegressor(hidden_layer_sizes=(32, 16), max_iter=300, random_state=42)
    cal_mlp.fit(X_cal_train_scaled, y_cal_logit)
    export_mlp_to_tfjs(cal_mlp, 5, [32, 16], CAL_DIR)
    print("Saved Calorie Multiplier TF.js model files.")

    # Train Form Score with MLPRegressor
    y_form_scaled = np.clip(y_form_train, 0.001, 0.999)
    y_form_logit = np.log(y_form_scaled / (1.0 - y_form_scaled))
    
    print("Training Form Score model with scikit-learn MLPRegressor...")
    form_mlp = MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=300, random_state=42)
    form_mlp.fit(X_form_train_scaled, y_form_logit)
    export_mlp_to_tfjs(form_mlp, 99, [64, 32], FORM_DIR)
    print("Saved Form Score TF.js model files.")

print("SUCCESS: Models trained and exported successfully!")
