// src/pages/AboutPage.tsx
import SpotlightCard from "@/components/UI/SpotlightCard";
import * as React from "react";

export default function AboutPage() {
  return (
    <main
      className="about d__w100"
      style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
    >
      {/* Hero */}
      <section
        className="about__hero container__syp"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          paddingTop: "3rem",
        }}
      >
        <h1 className="text__jumbo-2 text__primary" style={{ margin: 0 }}>
          AQI AWARNESS VIEWER
        </h1>

        <div
          className="about__hero-cta"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            className="btn btn--primary"
            href="https://www.gueepard.com/nasa"
            target="_blank"
            rel="noreferrer"
          >
            Project
          </a>
          <span className="b2" style={{ opacity: 0.7 }}>
            https://www.gueepard.com/nasa
          </span>
        </div>
      </section>

      {/* Summary */}
      <section
        className="about__summary container__syp"
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <h2 className="h3" style={{ margin: 0 }}>
          Summary
        </h2>
        <p className="b4">
          We developed a web platform that allows users to explore and
          understand air quality and its connection to climate change. The
          solution consists of both a user-friendly front end and a robust back
          end. The back end integrates directly with official NASA TEMPO
          satellite data hosted on AWS S3, enabling real-time access to
          atmospheric information without the need for local downloads. This
          data is exposed through an API that feeds into the web interface.
        </p>
        <p className="b4">
          To go beyond visualization, we designed and trained a custom machine
          learning model using a decade of historical atmospheric data. This
          model provides short-term forecasts of the Air Quality Index (AQI) up
          to 48 hours in advance, helping users anticipate air pollution levels
          in their area. By combining satellite data, cloud-based processing,
          and predictive modeling, our project not only makes complex climate
          and air quality data more accessible, but also highlights the
          immediate impact of climate change on human health and the
          environment.
        </p>
      </section>

      {/* Project Details - intro */}
      <section
        className="about__details container__syp"
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <h2 className="h3" style={{ margin: 0 }}>
          Project Details
        </h2>
        <h3 className="h5" style={{ margin: 0 }}>
          Project Summary
        </h3>
        <p className="b4">
          We developed the AQI Awareness Viewer, a web platform designed to make
          air quality data accessible and understandable to the general public,
          thereby highlighting the tangible impacts of climate change. Our
          solution features a user-friendly interface that visualizes real-time
          air quality data sourced directly from official NASA TEMPO satellite
          datasets on AWS S3. The core of our project is a custom-built API that
          processes this cloud-hosted data without requiring downloads.
          Furthermore, we&apos;ve integrated a bespoke machine learning model,
          trained on a decade of atmospheric data, which provides a 48-hour
          forecast of the Air Quality Index (AQI). This predictive capability
          transforms the platform from a simple viewer into a proactive tool,
          empowering users to make informed decisions about their health and
          environment.
        </p>
      </section>

      {/* 1–6 en SpotlightCard */}
      <section
        className="about__cards container__syp"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "1.5rem",
        }}
      >
        {/* 1 */}
        <SpotlightCard>
          <div
            style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
          >
            <h3 className="h4" style={{ margin: 0 }}>
              1. How It Works: From Earth Data to Actionable Insights
            </h3>
            <p className="b5">
              Our project is a fully integrated system that transforms raw
              satellite data into a user-centric web application. The workflow
              is built upon a modern, cloud-native architecture.
            </p>

            <div
              className="b5"
              style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
            >
              <div>
                <strong>Data Sourcing and Processing:</strong> We access NASA
                TEMPO data directly from AWS S3. Instead of downloading massive
                datasets, the back end processes data in-cloud for efficiency
                and freshness.
              </div>
              <div>
                <strong>Custom API:</strong> A robust API bridges NASA data and
                the web app—calculating AQI and exposing clean endpoints.
              </div>
              <div>
                <strong>Predictive Machine Learning Model:</strong> Using VARIMA
                on a decade of historical data, we forecast AQI 48 hours ahead
                by learning pollutant/meteorology interdependencies.
              </div>
              <div>
                <strong>User Interface (Front End):</strong> A clean viewer with
                maps and charts to explore current AQI, other areas, and the
                48-hour forecast—designed for non-experts.
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* 2 */}
        <SpotlightCard>
          <div
            style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
          >
            <h3 className="h4" style={{ margin: 0 }}>
              2. Benefits and Intended Impact
            </h3>

            <div
              className="b5"
              style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
            >
              <div>
                <strong>Accessibility:</strong> One simple, reliable place for
                trusted air quality information.
              </div>
              <div>
                <strong>Actionable Information:</strong> The 48-hour forecast
                helps people plan and reduce exposure.
              </div>
              <div>
                <strong>Educational Tool:</strong> Makes the invisible threat
                visible, raising awareness.
              </div>
              <div>
                <strong>Data Validity:</strong> Built on official NASA data for
                scientific soundness.
              </div>
            </div>

            <div
              className="b5"
              style={{
                marginTop: ".5rem",
                display: "flex",
                flexDirection: "column",
                gap: ".5rem",
              }}
            >
              <div>
                <strong>Empowering the Public:</strong> Provide knowledge to
                protect health and advocate for cleaner air.
              </div>
              <div>
                <strong>Bridging the Gap:</strong> Connects scientific data with
                everyday decisions.
              </div>
              <div>
                <strong>Driving Climate Action:</strong> Communicates local,
                immediate effects to encourage action.
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* 3 */}
        <SpotlightCard>
          <div
            style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
          >
            <h3 className="h4" style={{ margin: 0 }}>
              3. Technology and Tools
            </h3>
            <div
              className="b5"
              style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
            >
              <div>
                <strong>Cloud Platform:</strong> AWS (S3, compute) for storage,
                processing, and hosting the API.
              </div>
              <div>
                <strong>Data Sources:</strong> NASA TEMPO Level-3 datasets.
              </div>
              <div>
                <strong>Back End &amp; Data Science:</strong> Python, xarray,
                netCDF4, scikit-learn/statsmodels (VARIMA).
              </div>
              <div>
                <strong>API:</strong> Flask or FastAPI.
              </div>
              <div>
                <strong>Front End:</strong> HTML/CSS/JS (tu web actual).
              </div>
              <div>
                <strong>Software:</strong> Jupyter Notebooks para exploración y
                prototipado; Git para colaboración.
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* 4 */}
        <SpotlightCard>
          <div
            style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
          >
            <h3 className="h4" style={{ margin: 0 }}>
              4. Creativity and Team Considerations
            </h3>
            <div
              className="b5"
              style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
            >
              <div>
                <strong>Creative Approach:</strong> Serverless, in-cloud
                processing of S3 data; prediction beyond visualization;
                human-centered design.
              </div>
              <div>
                <strong>User Experience:</strong> Clear design driven by “is
                this useful and easy to understand?”.
              </div>
              <div>
                <strong>Data Integrity:</strong> Rely on official, validated
                NASA sources.
              </div>
              <div>
                <strong>Scalability:</strong> Built on AWS to scale across
                regions and traffic.
              </div>
              <div>
                <strong>The Problem:</strong> Not lack of data—lack of an
                intuitive platform; we bridge that gap.
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* 5 */}
        <SpotlightCard>
          <div
            style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
          >
            <h3 className="h4" style={{ margin: 0 }}>
              5. Challenges and Strategic Considerations
            </h3>

            <div
              className="b5"
              style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
            >
              <div>
                <strong>Data Handling and Performance:</strong> NetCDF/HDF5
                datasets are huge and complex.
                <em> Solution:</em> Cloud-native processing close to S3
                minimizes transfer and leverages scalable compute.
              </div>
              <div>
                <strong>Model Accuracy and Reliability:</strong> Forecast
                quality is critical.
                <em> Solution:</em> VARIMA trained on a decade of data captures
                seasonal/weekly/daily patterns and pollutant interdependencies.
              </div>
              <div>
                <strong>UX for Complex Data:</strong> Make science accessible
                without distortion.
                <em> Solution:</em> Clear visuals (AQI scale, maps, charts) and
                actionable insights over raw numbers.
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* 6 */}
        <SpotlightCard>
          <div
            style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
          >
            <h3 className="h4" style={{ margin: 0 }}>
              6. Future Work and Vision for Scalability
            </h3>

            <div
              className="b5"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".75rem",
              }}
            >
              <div>
                <strong>Expanding Data Sources &amp; Pollutants:</strong>{" "}
                Integrate missions like VIIRS/MODIS; forecast more pollutants
                (SO₂, CO) for granular insights.
              </div>
              <div>
                <strong>Enhanced Predictive Capabilities:</strong> Extend to
                72h–7d; evaluate LSTMs; real-time wildfire smoke plume
                detection/forecast.
              </div>
              <div>
                <strong>Personalization &amp; Proactive Alerts:</strong> Mobile
                app, push notifications, guidance for sensitive groups.
              </div>
              <div>
                <strong>Community &amp; Policy Impact:</strong> Dashboards for
                policymakers/researchers; citizen-science inputs to
                validate/refine the model.
              </div>
            </div>
          </div>
        </SpotlightCard>
      </section>

      {/* Conclusion */}
      <section
        className="about__conclusion container__syp"
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <h2 className="h3" style={{ margin: 0 }}>
          Conclusion
        </h2>
        <p className="b4">
          The AQI Awareness Viewer transforms complex NASA Earth observation
          into a tangible, predictive tool for the public. With cloud-native
          performance, a robust forecasting model, and human-centered design, it
          bridges the gap between scientific data and meaningful
          action—empowering users to protect their health and advocate for a
          cleaner, safer environment.
        </p>
      </section>

      {/* Use of AI */}
      <section
        className="about__ai container__syp"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: ".75rem",
          marginBottom: "3rem",
        }}
      >
        <h2 className="h4" style={{ margin: 0 }}>
          Use of Artificial Intelligence (AI)
        </h2>
        <p className="b4">
          All images, audio, and video content created for this project are
          original and not AI-generated. The team built the initial structure,
          advanced development, and core implementation. After that, AI tools
          assisted with:
        </p>
        <ul
          className="b4"
          style={{
            margin: 0,
            paddingLeft: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: ".35rem",
          }}
        >
          <li>
            <strong>Bug Correction</strong> — identify and resolve errors.
          </li>
          <li>
            <strong>Code Refinement</strong> — minor adjustments/optimizations.
          </li>
          <li>
            <strong>File Integration</strong> — merging and consolidating source
            files.
          </li>
        </ul>
      </section>
    </main>
  );
}
