// router.js
// A minimal, robust SPA router for Vanilla JS
document.addEventListener('DOMContentLoaded', () => {
    // Add page transition class to body
    document.body.classList.add('page-transition');
    setTimeout(() => document.body.classList.add('page-visible'), 50);
});

document.addEventListener('click', e => {
    const link = e.target.closest('a');
    
    // Only intercept local links
    if(link && link.origin === location.origin && link.target !== '_blank') {
        e.preventDefault();
        navigateTo(link.pathname);
    }
});

window.addEventListener('popstate', () => {
    navigateTo(location.pathname, false);
});

async function navigateTo(url, push = true) {
    // Fade out
    document.body.classList.remove('page-visible');
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Page not found');
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Wait for fade out
        await new Promise(r => setTimeout(r, 300));
        
        // Swap body content
        document.body.innerHTML = doc.body.innerHTML;
        document.title = doc.title;
        
        if (push) {
            history.pushState({}, '', url);
        }
        
        // Execute scripts (innerHTML does not run scripts automatically)
        const scripts = document.body.querySelectorAll('script');
        scripts.forEach(s => {
            const newScript = document.createElement('script');
            if(s.src) newScript.src = s.src;
            else newScript.textContent = s.textContent;
            document.body.appendChild(newScript);
        });

        // Fade in
        setTimeout(() => document.body.classList.add('page-visible'), 50);

    } catch (err) {
        console.error("Routing error:", err);
        // Fallback to normal navigation
        window.location.href = url;
    }
}
