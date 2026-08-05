package com.arch.surf;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.swmansion.pulsar.Pulsar;
import com.swmansion.pulsar.composers.PatternComposer;
import com.swmansion.pulsar.types.PatternData;
import com.swmansion.pulsar.types.ContinuousPattern;
import com.swmansion.pulsar.types.ValuePoint;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "Pulsar")
public class PulsarPlugin extends Plugin {
    private Pulsar pulsar;
    private PatternComposer activeComposer;

    @Override
    public void load() {
        pulsar = new Pulsar(getContext());
        activeComposer = pulsar.getPatternComposer();
    }

    @PluginMethod
    public void playPreset(PluginCall call) {
        String presetName = call.getString("name");
        if (presetName == null) {
            call.reject("Preset name is required");
            return;
        }

        if ("breakingWave".equals(presetName)) {
            try {
                // Composed "breakingWave" haptic signature: rising urge wave, sharp peak, and calm decay
                List<ValuePoint> amplitude = new ArrayList<>();
                amplitude.add(new ValuePoint(0, 0.05f));
                amplitude.add(new ValuePoint(1200, 0.45f));
                amplitude.add(new ValuePoint(1300, 0.15f));
                amplitude.add(new ValuePoint(1400, 0.30f));
                amplitude.add(new ValuePoint(2500, 0.0f));

                List<ValuePoint> frequency = new ArrayList<>();
                frequency.add(new ValuePoint(0, 0.10f));
                frequency.add(new ValuePoint(1200, 0.50f));
                frequency.add(new ValuePoint(1400, 0.35f));
                frequency.add(new ValuePoint(2500, 0.05f));

                ContinuousPattern continuous = new ContinuousPattern(amplitude, frequency);
                PatternData pattern = new PatternData(continuous, new ArrayList<>());

                activeComposer.parsePattern(pattern);
                activeComposer.play();
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to play breakingWave: " + e.getMessage());
            }
            return;
        }

        try {
            String resolvedPresetName = presetName;
            if ("success".equals(presetName)) {
                resolvedPresetName = "systemNotificationSuccess";
            }
            Object presets = pulsar.getPresets();
            // Dynamically invoke the method via Java reflection
            Method method = presets.getClass().getMethod(resolvedPresetName);
            method.invoke(presets);
            call.resolve();
        } catch (NoSuchMethodException e) {
            call.reject("Preset not found: " + presetName);
        } catch (Exception e) {
            call.reject("Failed to play preset: " + e.getMessage());
        }
    }

    @PluginMethod
    public void playInhaleWave(PluginCall call) {
        try {
            // Smooth swell: 0ms (amplitude 0) -> 4000ms (amplitude 1)
            List<ValuePoint> amplitude = new ArrayList<>();
            amplitude.add(new ValuePoint(0, 0.0f));
            amplitude.add(new ValuePoint(4000, 0.30f));

            // Frequency: 0ms (0.10f) -> 4000ms (0.40f)
            List<ValuePoint> frequency = new ArrayList<>();
            frequency.add(new ValuePoint(0, 0.10f));
            frequency.add(new ValuePoint(4000, 0.40f));

            ContinuousPattern continuous = new ContinuousPattern(amplitude, frequency);
            PatternData pattern = new PatternData(continuous, new ArrayList<>());

            activeComposer.parsePattern(pattern);
            activeComposer.play();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to play inhale wave: " + e.getMessage());
        }
    }

    @PluginMethod
    public void playExhaleWave(PluginCall call) {
        try {
            // Smooth decay: 0ms (amplitude 1) -> 4000ms (amplitude 0)
            List<ValuePoint> amplitude = new ArrayList<>();
            amplitude.add(new ValuePoint(0, 0.30f));
            amplitude.add(new ValuePoint(4000, 0.0f));

            // Frequency: 0ms (0.40f) -> 4000ms (0.05f)
            List<ValuePoint> frequency = new ArrayList<>();
            frequency.add(new ValuePoint(0, 0.40f));
            frequency.add(new ValuePoint(4000, 0.05f));

            ContinuousPattern continuous = new ContinuousPattern(amplitude, frequency);
            PatternData pattern = new PatternData(continuous, new ArrayList<>());

            activeComposer.parsePattern(pattern);
            activeComposer.play();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to play exhale wave: " + e.getMessage());
        }
    }

    @PluginMethod
    public void playHeartbeat(PluginCall call) {
        try {
            // Custom heartbeat pattern: two quick beats
            List<ValuePoint> amplitude = new ArrayList<>();
            amplitude.add(new ValuePoint(0, 0.12f));
            amplitude.add(new ValuePoint(100, 0.0f));
            amplitude.add(new ValuePoint(250, 0.16f));
            amplitude.add(new ValuePoint(350, 0.0f));
            amplitude.add(new ValuePoint(1000, 0.0f));

            List<ValuePoint> frequency = new ArrayList<>();
            frequency.add(new ValuePoint(0, 0.08f));
            frequency.add(new ValuePoint(350, 0.08f));
            frequency.add(new ValuePoint(1000, 0.0f));

            ContinuousPattern continuous = new ContinuousPattern(amplitude, frequency);
            PatternData pattern = new PatternData(continuous, new ArrayList<>());

            activeComposer.parsePattern(pattern);
            activeComposer.play();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to play heartbeat: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopActiveWave(PluginCall call) {
        try {
            activeComposer.stop();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop active wave: " + e.getMessage());
        }
    }
}
