import argparse
import json
from pathlib import Path

import tensorflow as tf


IMAGE_SIZE = (224, 224)
BATCH_SIZE = 24
SEED = 42


def build_model(class_count: int) -> tf.keras.Model:
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(*IMAGE_SIZE, 3))
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = base_model(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    outputs = tf.keras.layers.Dense(class_count, activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0007),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description="Train PrintForge FDM defect classifier.")
    parser.add_argument("--data-dir", required=True, help="Dataset folder with one subfolder per class.")
    parser.add_argument("--output-dir", required=True, help="Folder where model and labels will be saved.")
    parser.add_argument("--epochs", type=int, default=12)
    args = parser.parse_args()

    data_dir = Path(args.data_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="training",
        seed=SEED,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="validation",
        seed=SEED,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
    )

    labels = train_ds.class_names
    train_ds = train_ds.cache().shuffle(1000).prefetch(tf.data.AUTOTUNE)
    val_ds = val_ds.cache().prefetch(tf.data.AUTOTUNE)

    model = build_model(len(labels))
    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True),
        tf.keras.callbacks.ModelCheckpoint(
            output_dir / "print_quality_model.keras",
            save_best_only=True,
        ),
    ]

    history = model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)
    model.save(output_dir / "print_quality_model.keras")

    (output_dir / "labels.json").write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8")
    (output_dir / "history.json").write_text(
        json.dumps({key: [float(value) for value in values] for key, values in history.history.items()}, indent=2),
        encoding="utf-8",
    )

    print(f"Saved model to: {output_dir / 'print_quality_model.keras'}")
    print(f"Labels: {', '.join(labels)}")


if __name__ == "__main__":
    main()
