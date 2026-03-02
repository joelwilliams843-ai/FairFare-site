import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "@/App.css";

function Terms() {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>Terms of Service</h1>
      </div>
      
      <div className="legal-content">
        <p className="legal-date">Last updated: March 2026</p>
        
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using FairFare, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            FairFare is a mobility decision assistant that helps you make informed decisions 
            about when to book rides. We provide guidance based on general patterns and 
            publicly available information.
          </p>
          <p>
            <strong>Important:</strong> FairFare does not provide actual ride prices, 
            book rides, or process payments. We redirect you to third-party ride services 
            (such as Uber and Lyft) where you complete your booking directly.
          </p>
        </section>

        <section>
          <h2>3. No Affiliation</h2>
          <p>
            FairFare is an independent service and is not affiliated with, endorsed by, 
            or sponsored by Uber, Lyft, or any other ride-sharing company. All trademarks 
            and service marks belong to their respective owners.
          </p>
        </section>

        <section>
          <h2>4. Accuracy of Information</h2>
          <p>
            While we strive to provide helpful guidance, FairFare's recommendations are 
            estimates based on general patterns. Actual ride availability, prices, and 
            wait times may vary. You should always verify current conditions in the 
            respective ride-sharing apps before making decisions.
          </p>
        </section>

        <section>
          <h2>5. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul>
            <li>Use FairFare only for lawful purposes</li>
            <li>Not attempt to reverse engineer or compromise our service</li>
            <li>Not use the service in any way that could damage or overburden our systems</li>
            <li>Verify ride information with providers before booking</li>
          </ul>
        </section>

        <section>
          <h2>6. Limitation of Liability</h2>
          <p>
            FairFare is provided "as is" without warranties of any kind. We are not 
            responsible for:
          </p>
          <ul>
            <li>Decisions you make based on our guidance</li>
            <li>Issues with third-party ride services</li>
            <li>Any damages arising from use of our service</li>
            <li>Accuracy of demand estimates or recommendations</li>
          </ul>
        </section>

        <section>
          <h2>7. Third-Party Services</h2>
          <p>
            When you choose to open Uber, Lyft, or other services from FairFare, 
            you will be subject to their respective terms of service and privacy policies. 
            FairFare is not responsible for the actions, content, or policies of third parties.
          </p>
        </section>

        <section>
          <h2>8. Intellectual Property</h2>
          <p>
            The FairFare name, logo, and all related content are protected by intellectual 
            property laws. You may not use our branding without written permission.
          </p>
        </section>

        <section>
          <h2>9. Modifications to Service</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue FairFare at any time 
            without notice. We may also update these Terms of Service from time to time.
          </p>
        </section>

        <section>
          <h2>10. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws 
            of the State of California, without regard to conflict of law principles.
          </p>
        </section>

        <section>
          <h2>11. Contact</h2>
          <p>
            For questions about these Terms, please contact us at:
            <br />
            <a href="mailto:legal@fairfare.app">legal@fairfare.app</a>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Terms;
