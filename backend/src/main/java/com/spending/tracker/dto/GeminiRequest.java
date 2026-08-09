package com.spending.tracker.dto;

import java.util.ArrayList;
import java.util.List;

public class GeminiRequest {

    private List<Content> contents = new ArrayList<>();
    private GenerationConfig generationConfig = new GenerationConfig(0.85);

    public GeminiRequest() {}

    public GeminiRequest(String promptText) {
        this(promptText, 1.2);
    }

    public GeminiRequest(String promptText, double temperature) {
        this.contents.add(new Content(promptText));
        this.generationConfig = new GenerationConfig(temperature);
    }

    public List<Content> getContents() {
        return contents;
    }

    public void setContents(List<Content> contents) {
        this.contents = contents;
    }

    public GenerationConfig getGenerationConfig() {
        return generationConfig;
    }

    public void setGenerationConfig(GenerationConfig generationConfig) {
        this.generationConfig = generationConfig;
    }

    public static class Content {
        private List<Part> parts = new ArrayList<>();

        public Content() {}

        public Content(String text) {
            this.parts.add(new Part(text));
        }

        public List<Part> getParts() {
            return parts;
        }

        public void setParts(List<Part> parts) {
            this.parts = parts;
        }
    }

    public static class Part {
        private String text;

        public Part() {}

        public Part(String text) {
            this.text = text;
        }

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }
    }

    public static class GenerationConfig {
        private double temperature = 0.85;

        public GenerationConfig() {}

        public GenerationConfig(double temperature) {
            this.temperature = temperature;
        }

        public double getTemperature() {
            return temperature;
        }

        public void setTemperature(double temperature) {
            this.temperature = temperature;
        }
    }
}
