import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "@/App.css";

function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>Privacy Policy</h1>
      </div>
      
      <div className="legal-content">
        <p className="legal-date">Last updated: March 2026</p>
        
        <section>
          <h2>1. Information We Collect</h2>
          <p>
            FairFare collects minimal information to provide our mobility decision service:
          </p>
          <ul>
            <li><strong>Location Data:</strong> We use your device's location to help you find rides. Location data is only accessed when you explicitly request it and is not stored on our servers.</li>
            <li><strong>Search History:</strong> Recent pickup and destination searches are stored locally on your device for convenience. This data never leaves your device.</li>
            <li><strong>Usage Analytics:</strong> We collect anonymous usage statistics to improve our service. This does not include personally identifiable information.</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide ride comparison and decision guidance</li>
            <li>Improve our service and user experience</li>
            <li>Generate anonymous aggregate statistics</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Storage</h2>
          <p>
            FairFare does not maintain user accounts or store personal data on our servers. 
            All personal preferences and recent locations are stored locally on your device 
            using standard browser/app storage mechanisms.
          </p>
        </section>

        <section>
          <h2>4. Third-Party Services</h2>
          <p>
            When you choose to open Uber or Lyft from FairFare, you will be redirected 
            to those applications. Their respective privacy policies will apply to your 
            use of those services. FairFare does not share your data with these providers.
          </p>
        </section>

        <section>
          <h2>5. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your information. 
            Since we don't store personal data on our servers, there is minimal risk 
            of data breaches affecting your personal information.
          </p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Clear your local search history at any time through the app</li>
            <li>Deny location permissions</li>
            <li>Uninstall the app to remove all locally stored data</li>
          </ul>
        </section>

        <section>
          <h2>7. Children's Privacy</h2>
          <p>
            FairFare is not intended for children under 13. We do not knowingly 
            collect information from children under 13.
          </p>
        </section>

        <section>
          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify 
            you of any changes by posting the new Privacy Policy in the app.
          </p>
        </section>

        <section>
          <h2>9. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
            <br />
            <a href="mailto:privacy@fairfare.app">privacy@fairfare.app</a>
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
