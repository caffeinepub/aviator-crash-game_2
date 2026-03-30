import { motion } from "motion/react";

interface HomePageProps {
  onEnter: () => void;
}

const stats = [
  { value: "৫০০০+", label: "খেলোয়াড়" },
  { value: "২০০x", label: "সর্বোচ্চ জয়" },
  { value: "১০০%", label: "ভার্চুয়াল ক্রেডিট" },
  { value: "বিনামূল্যে", label: "খেলুন" },
];

const steps = [
  {
    num: "০১",
    title: "বেট করুন",
    desc: "আপনার পছন্দমতো ক্রেডিট বেট করুন। দুটি আলাদা বেট প্যানেল ব্যবহার করা যাবে।",
    icon: "🪙",
  },
  {
    num: "০২",
    title: "মাল্টিপ্লায়ার দেখুন",
    desc: "বিমান উড়তে থাকে আর মাল্টিপ্লায়ার বাড়তে থাকে। যত বেশি অপেক্ষা, তত বেশি পুরস্কার।",
    icon: "📈",
  },
  {
    num: "০৩",
    title: "ক্র্যাশের আগে ক্যাশ আউট করুন",
    desc: "সময়মতো ক্যাশ আউট করুন! বিমান ক্র্যাশ হলে বেট হারাবেন। Auto Cash Out সেট করুন।",
    icon: "✈️",
  },
];

export default function HomePage({ onEnter }: HomePageProps) {
  return (
    <div
      style={{
        background: "#0b1426",
        minHeight: "100vh",
        color: "#e8f0fe",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* Navbar */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 2rem",
          borderBottom: "1px solid rgba(157,255,58,0.12)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(11,20,38,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>✈</span>
          <span
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: "#9DFF3A",
              textTransform: "uppercase",
            }}
          >
            AVIATOR
          </span>
        </div>
        <button
          type="button"
          data-ocid="nav.primary_button"
          onClick={onEnter}
          style={{
            background: "#9DFF3A",
            color: "#0b1426",
            border: "none",
            borderRadius: "9999px",
            padding: "0.5rem 1.5rem",
            fontWeight: 700,
            fontSize: "0.875rem",
            cursor: "pointer",
            letterSpacing: "0.04em",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              "scale(1.05)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 20px rgba(157,255,58,0.5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          Play Now
        </button>
      </motion.header>

      {/* Hero */}
      <section
        style={{
          minHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "4rem 1.5rem",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "400px",
            background:
              "radial-gradient(ellipse, rgba(157,255,58,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{ maxWidth: "700px", position: "relative" }}
        >
          <div
            style={{
              display: "inline-block",
              background: "rgba(157,255,58,0.1)",
              border: "1px solid rgba(157,255,58,0.3)",
              borderRadius: "9999px",
              padding: "0.35rem 1rem",
              fontSize: "0.8rem",
              color: "#9DFF3A",
              fontWeight: 600,
              letterSpacing: "0.08em",
              marginBottom: "1.5rem",
              textTransform: "uppercase",
            }}
          >
            ✈ ভার্চুয়াল ক্রেডিট গেম
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 7vw, 5rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: "1.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            উড়ুন,{" "}
            <span
              style={{
                color: "#9DFF3A",
                textShadow: "0 0 30px rgba(157,255,58,0.5)",
              }}
            >
              জিতুন
            </span>
            \n , বাঁচুন!
          </h1>

          <p
            style={{
              fontSize: "1.15rem",
              color: "rgba(232,240,254,0.65)",
              lineHeight: 1.7,
              marginBottom: "2.5rem",
              maxWidth: "520px",
              margin: "0 auto 2.5rem",
            }}
          >
            বিমান উড়তে থাকে, মাল্টিপ্লায়ার বাড়তে থাকে — ক্র্যাশের আগে ক্যাশ আউট করুন এবং জিতুন।
            সম্পূর্ণ ভার্চুয়াল, সম্পূর্ণ বিনোদন।
          </p>

          <motion.button
            data-ocid="hero.primary_button"
            onClick={onEnter}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: "#9DFF3A",
              color: "#0b1426",
              border: "none",
              borderRadius: "12px",
              padding: "1rem 2.5rem",
              fontSize: "1.15rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow:
                "0 0 30px rgba(157,255,58,0.4), 0 4px 20px rgba(0,0,0,0.4)",
              letterSpacing: "0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            ✈ গেম শুরু করুন
          </motion.button>
        </motion.div>

        {/* Floating plane decoration */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 3, 0] }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            right: "10%",
            top: "25%",
            fontSize: "4rem",
            opacity: 0.18,
            pointerEvents: "none",
          }}
        >
          ✈
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -2, 0] }}
          transition={{
            duration: 5.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 1,
          }}
          style={{
            position: "absolute",
            left: "8%",
            bottom: "30%",
            fontSize: "2.5rem",
            opacity: 0.12,
            pointerEvents: "none",
          }}
        >
          ✈
        </motion.div>
      </section>

      {/* Stats Strip */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{
          background: "rgba(157,255,58,0.05)",
          borderTop: "1px solid rgba(157,255,58,0.15)",
          borderBottom: "1px solid rgba(157,255,58,0.15)",
          padding: "2rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "2rem",
            textAlign: "center",
          }}
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.value}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 900,
                  color: "#9DFF3A",
                  textShadow: "0 0 20px rgba(157,255,58,0.4)",
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(232,240,254,0.5)",
                  marginTop: "0.4rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* How to Play */}
      <section
        style={{
          padding: "5rem 1.5rem",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <h2
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              fontWeight: 800,
              marginBottom: "0.75rem",
              letterSpacing: "-0.02em",
            }}
          >
            কীভাবে খেলবেন?
          </h2>
          <p style={{ color: "rgba(232,240,254,0.5)", fontSize: "1rem" }}>
            তিনটি সহজ ধাপে শুরু করুন
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              data-ocid={`howto.card.${i + 1}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ y: -4 }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(157,255,58,0.15)",
                borderRadius: "16px",
                padding: "2rem 1.5rem",
                cursor: "default",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <span style={{ fontSize: "2rem" }}>{step.icon}</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "rgba(157,255,58,0.5)",
                    letterSpacing: "0.1em",
                    fontFamily: "monospace",
                  }}
                >
                  {step.num}
                </span>
              </div>
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "#e8f0fe",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "rgba(232,240,254,0.5)",
                  lineHeight: 1.65,
                }}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        style={{
          padding: "5rem 1.5rem",
          textAlign: "center",
          background:
            "radial-gradient(ellipse at center, rgba(157,255,58,0.07) 0%, transparent 65%)",
        }}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 800,
              marginBottom: "1rem",
            }}
          >
            এখনই শুরু করুন!
          </h2>
          <p
            style={{
              color: "rgba(232,240,254,0.55)",
              marginBottom: "2rem",
              fontSize: "1rem",
            }}
          >
            কোনো নিবন্ধন নেই, কোনো আসল অর্থ নেই — শুধু বিনোদন
          </p>
          <motion.button
            data-ocid="cta.primary_button"
            onClick={onEnter}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: "transparent",
              color: "#9DFF3A",
              border: "2px solid #9DFF3A",
              borderRadius: "12px",
              padding: "0.9rem 2.5rem",
              fontSize: "1.05rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(157,255,58,0.2)",
              transition: "background 0.2s",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(157,255,58,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            ✈ গেমে প্রবেশ করুন
          </motion.button>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "2rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "0.8rem",
            color: "rgba(232,240,254,0.3)",
            marginBottom: "0.5rem",
            letterSpacing: "0.04em",
          }}
        >
          ⚠️ বিনোদনের জন্য শুধুমাত্র — কোনো বাস্তব অর্থ নেই
        </div>
        <div style={{ fontSize: "0.78rem", color: "rgba(232,240,254,0.2)" }}>
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(157,255,58,0.5)", textDecoration: "none" }}
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
