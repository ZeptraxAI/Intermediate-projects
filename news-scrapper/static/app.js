/* -------------------------------------------------------------
 * News Scraper Dashboard - JavaScript Controller
 * Interactivity and API Bindings
 * ------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    // Application State
    const state = {
        articles: [],
        config: {
            mock_email: true,
            active_sources: ["Hacker News", "TechCrunch", "BBC News"],
            smtp: {
                host: "",
                port: 587,
                sender: "",
                password: "",
                use_ssl: false,
                subject: "News Scraper - Curated Daily Summary"
            }
        },
        sentEmailsCount: 0
    };

    // DOM Elements
    const elements = {
        navItems: document.querySelectorAll(".nav-item"),
        screens: document.querySelectorAll(".tab-screen"),
        pageTitle: document.getElementById("page-title"),
        pageSubtitle: document.getElementById("page-subtitle"),
        triggerScrapeBtn: document.getElementById("trigger-scrape-btn"),
        toastContainer: document.getElementById("toast-container"),
        
        // Dashboard
        newsTbody: document.getElementById("news-tbody"),
        searchInput: document.getElementById("search-input"),
        sourceFilter: document.getElementById("source-filter"),
        
        // KPIs
        metricTotalArticles: document.getElementById("metric-total-articles"),
        metricActiveSources: document.getElementById("metric-active-sources"),
        metricLastOperation: document.getElementById("metric-last-operation"),
        metricSentEmails: document.getElementById("metric-sent-emails"),
        
        // Sources
        sourceHn: document.getElementById("source-hn"),
        sourceTc: document.getElementById("source-tc"),
        sourceBbc: document.getElementById("source-bbc"),
        saveSourcesBtn: document.getElementById("save-sources-btn"),
        
        // Email
        emailForm: document.getElementById("email-form"),
        emailRecipient: document.getElementById("email-recipient"),
        emailCustomMsg: document.getElementById("email-custom-msg"),
        previewEmailBtn: document.getElementById("preview-email-btn"),
        sendEmailBtn: document.getElementById("send-email-btn"),
        emailPreviewIframe: document.getElementById("email-preview-iframe"),
        
        // Settings
        settingsMockEmail: document.getElementById("settings-mock-email"),
        smtpSettingsFields: document.getElementById("smtp-settings-fields"),
        smtpHost: document.getElementById("smtp-host"),
        smtpPort: document.getElementById("smtp-port"),
        smtpSender: document.getElementById("smtp-sender"),
        smtpPassword: document.getElementById("smtp-password"),
        smtpSsl: document.getElementById("smtp-ssl"),
        saveSettingsBtn: document.getElementById("save-settings-btn")
    };

    // Initialize Page
    init();

    async function init() {
        // Activate Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Setup Tab Navigation
        setupNavigation();
        
        // Load Config and Sync UI
        await fetchConfig();
        
        // Bind UI Events
        bindEvents();
        
        // Trigger initial scrape automatically to populate dashboard
        triggerScrape(true);
    }

    // -------------------------------------------------------------
    // Tab Navigation Setup
    // -------------------------------------------------------------
    function setupNavigation() {
        elements.navItems.forEach(item => {
            item.addEventListener("click", () => {
                const targetTab = item.getAttribute("data-tab");
                
                // Toggle active sidebar items
                elements.navItems.forEach(nav => nav.classList.remove("active"));
                item.classList.add("active");
                
                // Toggle active screens
                elements.screens.forEach(screen => screen.classList.remove("active"));
                const targetScreen = document.getElementById(`tab-${targetTab}`);
                if (targetScreen) {
                    targetScreen.classList.add("active");
                }
                
                // Update headers dynamically
                updateHeaders(targetTab);
            });
        });
    }

    function updateHeaders(tab) {
        const headerConfig = {
            dashboard: {
                title: "Dashboard",
                subtitle: "Real-time curation from across the technology landscape."
            },
            sources: {
                title: "Scraper Sources",
                subtitle: "Select which channels and sources to target for information gathering."
            },
            email: {
                title: "Email Campaigns",
                subtitle: "Send modern, compiled newsletters directly to subscribers' inboxes."
            },
            settings: {
                title: "Settings",
                subtitle: "Configure underlying engines, mock systems, and security credentials."
            }
        };
        
        const config = headerConfig[tab] || headerConfig.dashboard;
        elements.pageTitle.textContent = config.title;
        elements.pageSubtitle.textContent = config.subtitle;
    }

    // -------------------------------------------------------------
    // API Integrations (Fetch and Post Config)
    // -------------------------------------------------------------
    async function fetchConfig() {
        try {
            const response = await fetch("/api/config");
            if (response.ok) {
                state.config = await response.json();
                syncConfigToUI();
            } else {
                showToast("Error", "Could not load settings config from backend.", "error");
            }
        } catch (error) {
            console.error("Config fetch failed:", error);
            showToast("Connection Error", "Failed to connect to the backend server.", "error");
        }
    }

    function syncConfigToUI() {
        // Sync active sources
        elements.sourceHn.checked = state.config.active_sources.includes("Hacker News");
        elements.sourceTc.checked = state.config.active_sources.includes("TechCrunch");
        elements.sourceBbc.checked = state.config.active_sources.includes("BBC News");
        
        // Sync settings tab
        elements.settingsMockEmail.checked = state.config.mock_email;
        toggleSmtpFields(state.config.mock_email);
        
        elements.smtpHost.value = state.config.smtp.host || "";
        elements.smtpPort.value = state.config.smtp.port || 587;
        elements.smtpSender.value = state.config.smtp.sender || "";
        elements.smtpPassword.value = state.config.smtp.password || "";
        elements.smtpSsl.checked = state.config.smtp.use_ssl || false;
        
        // Update KPI for active sources
        elements.metricActiveSources.textContent = state.config.active_sources.length;
    }

    function toggleSmtpFields(isMock) {
        if (isMock) {
            elements.smtpSettingsFields.classList.add("disabled");
            elements.smtpHost.disabled = true;
            elements.smtpPort.disabled = true;
            elements.smtpSender.disabled = true;
            elements.smtpPassword.disabled = true;
            elements.smtpSsl.disabled = true;
        } else {
            elements.smtpSettingsFields.classList.remove("disabled");
            elements.smtpHost.disabled = false;
            elements.smtpPort.disabled = false;
            elements.smtpSender.disabled = false;
            elements.smtpPassword.disabled = false;
            elements.smtpSsl.disabled = false;
        }
    }

    async function saveConfig() {
        try {
            const response = await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(state.config)
            });
            
            if (response.ok) {
                const data = await response.json();
                state.config = data.config;
                syncConfigToUI();
                showToast("Success", "Settings saved successfully!", "success");
            } else {
                showToast("Error", "Backend failed to save configuration.", "error");
            }
        } catch (error) {
            console.error("Save config failed:", error);
            showToast("Connection Error", "Could not send configurations to server.", "error");
        }
    }

    // -------------------------------------------------------------
    // Scraping Controller
    // -------------------------------------------------------------
    async function triggerScrape(isInitial = false) {
        // Prevent clicking while scraping is active
        elements.triggerScrapeBtn.disabled = true;
        const btnText = elements.triggerScrapeBtn.querySelector("span");
        const origText = btnText.textContent;
        btnText.textContent = "Scraping headlines...";
        
        const spinIcon = elements.triggerScrapeBtn.querySelector("i");
        if (spinIcon) spinIcon.style.animation = "spin 1s linear infinite";

        if (!isInitial) {
            showToast("Scraper Core", "Contacting news hubs. Scraping initiated...", "info");
        }

        try {
            const response = await fetch("/api/scrape");
            if (response.ok) {
                const data = await response.json();
                state.articles = data.articles;
                renderArticles(state.articles);
                
                // Update KPIs
                elements.metricTotalArticles.textContent = state.articles.length;
                const now = new Date();
                elements.metricLastOperation.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                if (!isInitial) {
                    showToast("Scraping Completed", `Fetched ${data.article_count} fresh articles.`, "success");
                }
            } else {
                showToast("Scraper Error", "Failed to compile scraped endpoints.", "error");
            }
        } catch (error) {
            console.error("Scraping trigger failed:", error);
            showToast("Scraper Offline", "Failed to establish scraping link with backend.", "error");
        } finally {
            elements.triggerScrapeBtn.disabled = false;
            btnText.textContent = origText;
            if (spinIcon) spinIcon.style.animation = "";
        }
    }

    // -------------------------------------------------------------
    // Render News Table rows
    // -------------------------------------------------------------
    function renderArticles(list) {
        if (!list || list.length === 0) {
            elements.newsTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty-state">
                        <div class="empty-icon-wrapper">
                            <i data-lucide="inbox"></i>
                        </div>
                        <h3>No Articles Found</h3>
                        <p>No headlines matched your search criteria or the active sources are offline.</p>
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        let html = "";
        list.forEach(article => {
            let badgeClass = "badge-hn";
            let shortSource = "HN";
            if (article.source === "TechCrunch") {
                badgeClass = "badge-tc";
                shortSource = "TC";
            } else if (article.source === "BBC News") {
                badgeClass = "badge-bbc";
                shortSource = "BBC";
            }

            html += `
                <tr>
                    <td>
                        <span class="badge ${badgeClass}">${shortSource}</span>
                    </td>
                    <td>
                        <div class="article-title-container">
                            <a href="${article.url}" target="_blank" class="article-title">${article.title}</a>
                            <span class="article-summary">${article.summary}</span>
                        </div>
                    </td>
                    <td>
                        <span class="article-author">${article.author}</span>
                        <div class="article-score">${article.metadata}</div>
                    </td>
                    <td>
                        <span class="article-time">${article.timestamp}</span>
                    </td>
                    <td style="text-align: right;">
                        <a href="${article.url}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 6px 12px; border-radius: 8px; font-size: 12px;">
                            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
                        </a>
                    </td>
                </tr>
            `;
        });

        elements.newsTbody.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    // -------------------------------------------------------------
    // Search and Filtering Logic
    // -------------------------------------------------------------
    function applyFilters() {
        const query = elements.searchInput.value.toLowerCase().trim();
        const selectedSource = elements.sourceFilter.value;

        const filtered = state.articles.filter(article => {
            const matchesSearch = article.title.toLowerCase().includes(query) || 
                                  article.summary.toLowerCase().includes(query) ||
                                  article.author.toLowerCase().includes(query);
            
            const matchesSource = selectedSource === "all" || article.source === selectedSource;
            
            return matchesSearch && matchesSource;
        });

        renderArticles(filtered);
    }

    // -------------------------------------------------------------
    // Email Sandbox Operations
    // -------------------------------------------------------------
    async function loadNewsletterPreview() {
        if (state.articles.length === 0) {
            showToast("Preview Error", "Please scrape articles first to preview.", "error");
            return;
        }

        elements.previewEmailBtn.disabled = true;
        elements.previewEmailBtn.querySelector("span").textContent = "Compiling template...";

        try {
            // We issue a POST request targeting email compilation and read the mock output preview HTML
            const response = await fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient: elements.emailRecipient.value || "preview@example.com",
                    custom_message: elements.emailCustomMsg.value || "This is a sandbox preview.",
                    articles: state.articles.slice(0, 8) // Limit articles to fit beautifully in the sandbox
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Load HTML in iframe
                elements.emailPreviewIframe.srcdoc = data.html_preview;
                showToast("Sandbox Updated", "Compiled newsletter loaded in preview frame.", "success");
            } else {
                showToast("Compile Error", "Backend failed to compile HTML templates.", "error");
            }
        } catch (error) {
            console.error("Preview email failed:", error);
            showToast("Connection Error", "Could not connect to newsletter backend.", "error");
        } finally {
            elements.previewEmailBtn.disabled = false;
            elements.previewEmailBtn.querySelector("span").textContent = "Preview Template";
        }
    }

    async function sendNewsletter(e) {
        e.preventDefault();

        if (state.articles.length === 0) {
            showToast("Dispatch Cancelled", "No news items available to dispatch.", "error");
            return;
        }

        elements.sendEmailBtn.disabled = true;
        elements.sendEmailBtn.querySelector("span").textContent = "Dispatching digest...";

        try {
            const response = await fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient: elements.emailRecipient.value,
                    custom_message: elements.emailCustomMsg.value,
                    articles: state.articles
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Increment sent counters
                state.sentEmailsCount++;
                elements.metricSentEmails.textContent = state.sentEmailsCount;
                
                if (data.mode === "mock") {
                    showToast("Mock Sent Successfully", `Email compiled and logged to server logs.`, "success");
                    elements.emailPreviewIframe.srcdoc = data.html_preview;
                } else {
                    showToast("Newsletter Dispatched", `Real email sent successfully to ${data.recipient}!`, "success");
                }
                
                // Reset form custom note
                elements.emailCustomMsg.value = "";
            } else {
                const err = await response.json();
                showToast("Delivery Failed", err.detail || "Connection failure with SMTP.", "error");
            }
        } catch (error) {
            console.error("Email dispatch failed:", error);
            showToast("Connection Error", "Backend email server could not be reached.", "error");
        } finally {
            elements.sendEmailBtn.disabled = false;
            elements.sendEmailBtn.querySelector("span").textContent = "Dispatch Newsletter";
        }
    }

    // -------------------------------------------------------------
    // Bind Event Listeners
    // -------------------------------------------------------------
    function bindEvents() {
        // Scraper trigger button
        elements.triggerScrapeBtn.addEventListener("click", () => triggerScrape(false));
        
        // Search & Source Filtering
        elements.searchInput.addEventListener("input", applyFilters);
        elements.sourceFilter.addEventListener("change", applyFilters);
        
        // Active sources update
        elements.saveSourcesBtn.addEventListener("click", () => {
            const activeSources = [];
            if (elements.sourceHn.checked) activeSources.push("Hacker News");
            if (elements.sourceTc.checked) activeSources.push("TechCrunch");
            if (elements.sourceBbc.checked) activeSources.push("BBC News");
            
            state.config.active_sources = activeSources;
            saveConfig();
        });

        // Mock Toggle interaction
        elements.settingsMockEmail.addEventListener("change", (e) => {
            toggleSmtpFields(e.target.checked);
        });

        // SMTP settings save button
        elements.saveSettingsBtn.addEventListener("click", () => {
            state.config.mock_email = elements.settingsMockEmail.checked;
            state.config.smtp.host = elements.smtpHost.value;
            state.config.smtp.port = parseInt(elements.smtpPort.value) || 587;
            state.config.smtp.sender = elements.smtpSender.value;
            state.config.smtp.password = elements.smtpPassword.value;
            state.config.smtp.use_ssl = elements.smtpSsl.checked;
            
            saveConfig();
        });

        // Email campaigns buttons
        elements.previewEmailBtn.addEventListener("click", loadNewsletterPreview);
        elements.emailForm.addEventListener("submit", sendNewsletter);
    }

    // -------------------------------------------------------------
    // Toast Alert Utilities
    // -------------------------------------------------------------
    function showToast(title, message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        
        let iconName = "info";
        if (type === "success") iconName = "check-circle-2";
        if (type === "error") iconName = "alert-triangle";
        
        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <div class="toast-content">
                <span class="toast-title">${title}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        elements.toastContainer.appendChild(toast);
        if (window.lucide) window.lucide.createIcons();
        
        // Slide in
        setTimeout(() => {
            toast.classList.add("show");
        }, 50);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => {
                toast.remove();
            }, 350);
        }, 4000);
    }
});
