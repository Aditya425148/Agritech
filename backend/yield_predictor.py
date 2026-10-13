"""Small JSON bridge for the saved crop-yield sklearn pipeline.

The model was saved with sklearn 1.6.1. This bridge reads its saved encoder
categories and regression coefficients, then reproduces the pipeline's
one-hot encoding + linear-regression calculation exactly.
"""
import contextlib
import io
import json
import os
import sys
import warnings

import joblib
import sklearn.compose._column_transformer as column_transformer


# sklearn 1.9 no longer exports this 1.6 pickle helper.  Defining it allows
# the trusted, project-local model to be read without changing its values.
if not hasattr(column_transformer, "_RemainderColsList"):
    column_transformer._RemainderColsList = type("_RemainderColsList", (list,), {})


def load_model_parts():
    model_path = os.path.join(os.path.dirname(__file__), "..", "model", "crop_yield_model.pkl")
    with warnings.catch_warnings(), contextlib.redirect_stderr(io.StringIO()):
        warnings.simplefilter("ignore")
        pipeline = joblib.load(model_path)
    encoder = pipeline.named_steps["preprocessor"].named_transformers_["categorical"]
    regressor = pipeline.named_steps["regressor"]
    return encoder.categories_, regressor.coef_, regressor.intercept_


def main():
    payload = json.load(sys.stdin)
    categories, coefficients, intercept = load_model_parts()
    categorical_values = [payload["Region"], payload["Soil_Type"], payload["Crop"], payload["Weather_Condition"]]
    features = []
    for value, allowed in zip(categorical_values, categories):
        features.extend(1.0 if value == category else 0.0 for category in allowed)
    features.extend([
        float(payload["Rainfall_mm"]),
        float(payload["Temperature_Celsius"]),
        1.0 if payload["Fertilizer_Used"] is True else 0.0,
        1.0 if payload["Irrigation_Used"] is True else 0.0,
        float(payload["Days_to_Harvest"]),
    ])
    prediction = float(intercept + sum(weight * value for weight, value in zip(coefficients, features)))
    print(json.dumps({"predicted_yield_tons_per_hectare": prediction}))


if __name__ == "__main__":
    main()
