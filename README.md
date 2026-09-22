# GNSS Reference Station Viewer

A web-based viewer for GNSS reference stations in Chile.

This project was originally developed as an academic exercise for a course on **Observation Adjustment**. The initial goal was to process an NTRIP station dataset and visualize the available GNSS reference stations on an interactive map.

The project was later expanded with additional geospatial visualization and analysis tools.

> **Note:** The application interface is currently in Spanish and the dataset focuses on GNSS reference stations in Chile.

## Live Demo

https://geofuru.github.io/GNSS-Reference-Station-Viewer/

## Features

* **Station visualization and filtering**
  GNSS reference stations are displayed on an interactive map and can be searched and filtered by network.

* **Distance analysis**
  Uses the browser's location to calculate distances to nearby reference stations in real time.

* **Measurement tools**
  Allows users to draw polygons on the map and calculate their areas and perimeters. Polygon vertices are also converted to UTM coordinates.

* **Coverage analysis**
  Adjustable radius areas can be generated around stations to provide a visual representation of their potential coverage.

* **Data export**
  Drawn polygons can be exported as `.csv` files containing their vertices and coordinate information.

## Technologies

* HTML
* JavaScript
* Leaflet
* OpenStreetMap
* GNSS / NTRIP station data
* UTM coordinate conversion
* CSV data processing

## Project Context

This project was developed as an **academic project** involving the processing and visualization of GNSS reference station data.

The dataset and geographic context are focused on **Chile**.

## Project Status

Academic project / course exercise.
