package org.telegram.ui;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.telegram.messenger.AccountInstance;
import org.telegram.messenger.AndroidUtilities;
import org.telegram.messenger.ApplicationLoader;
import org.telegram.messenger.NotificationCenter;
import org.telegram.messenger.R;
import org.telegram.messenger.UserConfig;
import org.telegram.ui.ActionBar.ActionBar;
import org.telegram.ui.ActionBar.BaseFragment;
import org.telegram.ui.ActionBar.Theme;

/**
 * FairyChat Premium — our OWN premium page (not Telegram's).
 * Pricing: INR 99/month, INR 599/year.
 * Payment: UPI (this build is sideloaded, not from Play Store, so direct
 * UPI is allowed). Code redemption: FairyChat backend (Stage 4 wiring).
 *
 * Founder code FC-FOUNDER-2026 activates FairyChat Premium free forever
 * on this device (for the owner to test all premium features).
 */
public class FairyChatPremiumActivity extends BaseFragment {

    private static final int PURPLE = 0xFF7C3AED;
    private static final int PURPLE_DARK = 0xFF6D28D9;
    private static final int GOLD = 0xFFD9B64C;
    private static final String FOUNDER_CODE = "FC-FOUNDER-2026";

    private TextView bannerTitle;
    private TextView bannerSub;
    private LinearLayout activeCard;
    private LinearLayout redeemCard;

    /** Premium flag used by all FairyChat premium features. */
    public static boolean isPremiumActive(Context ctx) {
        if (ctx == null) {
            ctx = ApplicationLoader.applicationContext;
        }
        SharedPreferences prefs = ctx.getSharedPreferences("fairychat_config", Context.MODE_PRIVATE);
        return prefs.getBoolean("premium_active", false);
    }

    private void setPremiumActive(boolean active) {
        Context ctx = getContext() != null ? getContext() : ApplicationLoader.applicationContext;
        ctx.getSharedPreferences("fairychat_config", Context.MODE_PRIVATE)
            .edit().putBoolean("premium_active", active).apply();
        // Refresh every premium surface in the app (badge, colors, emoji...).
        try {
            NotificationCenter notificationCenter = AccountInstance
                .getInstance(UserConfig.selectedAccount).getNotificationCenter();
            notificationCenter.postNotificationName(NotificationCenter.currentUserPremiumStatusChanged);
        } catch (Exception ignored) {
            // No account yet (login screen) — flag applies on next launch.
        }
    }

    @Override
    public View createView(Context context) {
        actionBar.setBackButtonImage(R.drawable.ic_ab_back);
        actionBar.setTitle("Advanced FairyChat Premium");
        actionBar.setBackgroundColor(getThemedColor(Theme.key_windowBackgroundWhite));
        actionBar.setTitleColor(PURPLE);
        actionBar.setItemsColor(PURPLE, false);
        actionBar.setActionBarMenuOnItemClick(new ActionBar.ActionBarMenuOnItemClick() {
            @Override
            public void onItemClick(int id) {
                if (id == -1) {
                    finishFragment();
                }
            }
        });

        int pad = AndroidUtilities.dp(20);
        int bg = getThemedColor(Theme.key_windowBackgroundWhite);
        int txt = getThemedColor(Theme.key_windowBackgroundWhiteBlackText);
        int sub = getThemedColor(Theme.key_windowBackgroundWhiteGrayText);

        ScrollView scroll = new ScrollView(context);
        scroll.setBackgroundColor(bg);

        LinearLayout root = new LinearLayout(context);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);
        scroll.addView(root, new ScrollView.LayoutParams(
                ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.WRAP_CONTENT));

        // ---- header banner (purple->gold gradient) ----
        LinearLayout banner = new LinearLayout(context);
        banner.setOrientation(LinearLayout.VERTICAL);
        banner.setGravity(Gravity.CENTER);
        banner.setPadding(pad, pad, pad, pad);
        GradientDrawable bannerBg = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR, new int[]{PURPLE, PURPLE_DARK, GOLD});
        bannerBg.setCornerRadius(AndroidUtilities.dp(18));
        banner.setBackground(bannerBg);

        bannerTitle = new TextView(context);
        bannerTitle.setText("Advanced FairyChat Premium");
        bannerTitle.setTextColor(Color.WHITE);
        bannerTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        bannerTitle.setTypeface(Typeface.DEFAULT_BOLD);
        bannerTitle.setGravity(Gravity.CENTER);
        banner.addView(bannerTitle);

        bannerSub = new TextView(context);
        bannerSub.setTextColor(0xFFF3E8FF);
        bannerSub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        bannerSub.setGravity(Gravity.CENTER);
        bannerSub.setPadding(0, AndroidUtilities.dp(8), 0, 0);
        banner.addView(bannerSub);

        root.addView(banner, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        // ---- features ----
        addSectionTitle(context, root, "Advanced FairyChat Features (sirf FairyChat me)", txt);
        String[][] features = {
            {"\uD83C\uDFA8", "Exclusive FairyChat Themes", "Purple/Gold, Midnight, Neon aur bhi — sirf premium ke liye"},
            {"\u2728", "720 Animated Emoji Pack", "Text ke sath Lottie animated emojis aur stickers"},
            {"\uD83C\uDF1F", "Premium Badge", "Apne naam ke sath premium star badge"},
            {"\uD83D\uDDBC\uFE0F", "Profile BG Colors + Animated Profile", "Custom profile background colors aur animated profile elements"},
            {"\uD83D\uDCF1", "6 App Icon Editions", "Default, Vintage, Aqua, Premium, Turbo, Nox"},
            {"\uD83D\uDE80", "Early Access", "Naye features sabse pehle"}
        };
        for (String[] f : features) {
            addFeatureRow(context, root, f[0], f[1], f[2], txt, sub);
        }

        // ---- active state card (visible when premium is on) ----
        activeCard = card(context);
        TextView activeTitle = new TextView(context);
        activeTitle.setText("\u2714 FairyChat Premium ACTIVE");
        activeTitle.setTextColor(PURPLE);
        activeTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        activeTitle.setTypeface(Typeface.DEFAULT_BOLD);
        activeCard.addView(activeTitle);
        TextView activeSub = new TextView(context);
        activeSub.setText("Status: Founder \u2014 Lifetime (FREE)\nSaare premium features unlocked!");
        activeSub.setTextColor(txt);
        activeSub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        activeSub.setPadding(0, AndroidUtilities.dp(6), 0, 0);
        activeCard.addView(activeSub);

        Button reset = new Button(context);
        reset.setText("Deactivate (testing)");
        reset.setTextColor(PURPLE);
        reset.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        GradientDrawable resetBg = new GradientDrawable();
        resetBg.setColor(0x00000000);
        resetBg.setCornerRadius(AndroidUtilities.dp(12));
        resetBg.setStroke(AndroidUtilities.dp(1), PURPLE);
        reset.setBackground(resetBg);
        reset.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                setPremiumActive(false);
                Toast.makeText(getContext(), "Premium deactivate (testing)", Toast.LENGTH_SHORT).show();
                refreshState();
            }
        });
        activeCard.addView(reset, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        root.addView(activeCard, cardParams());

        // ---- pricing (hidden once active) ----
        addSectionTitle(context, root, "Plans (INR)", txt);
        addPlanCard(context, root, "Monthly", "\u20B999 / month", "Sab kuch unlock — month ke hisab se", false, sub);
        addPlanCard(context, root, "Yearly \u2014 BEST VALUE", "\u20B9599 / year", "2 month free ke sath (49% bachat!)", true, sub);

        // ---- how to pay ----
        addSectionTitle(context, root, "Kaise kharidein", txt);
        LinearLayout payCard = card(context);
        TextView pay1 = new TextView(context);
        pay1.setText("1. Payment karo (UPI): fairychat@upi\n2. Payment screenshot + apna FairyChat number bhejo support ko\n3. Aapko 12-digit ka Premium Code milega\n4. Neeche code enter karke Activate karo\n\n(Owner/testing ke liye founder code bhi chalta hai)");
        pay1.setTextColor(txt);
        pay1.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        pay1.setLineSpacing(AndroidUtilities.dp(3), 1f);
        payCard.addView(pay1);
        root.addView(payCard, cardParams());

        // ---- redeem ----
        addSectionTitle(context, root, "Premium Code Activate karo", txt);
        redeemCard = card(context);
        final EditText codeInput = new EditText(context);
        codeInput.setHint("Code (jaise FC-XXXX-XXXX)");
        codeInput.setTextColor(txt);
        codeInput.setHintTextColor(sub);
        codeInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        codeInput.setSingleLine();
        redeemCard.addView(codeInput, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        Button activate = new Button(context);
        activate.setText("Activate Premium");
        activate.setTextColor(Color.WHITE);
        activate.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        GradientDrawable btnBg = new GradientDrawable();
        btnBg.setColor(PURPLE);
        btnBg.setCornerRadius(AndroidUtilities.dp(12));
        activate.setBackground(btnBg);
        activate.setPadding(0, AndroidUtilities.dp(12), 0, AndroidUtilities.dp(12));
        activate.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String code = codeInput.getText().toString().trim();
                if (TextUtils.isEmpty(code)) {
                    Toast.makeText(getContext(), "Code enter karo", Toast.LENGTH_SHORT).show();
                    return;
                }
                if (FOUNDER_CODE.equalsIgnoreCase(code)) {
                    setPremiumActive(true);
                    Toast.makeText(getContext(), "\u2B50 FairyChat Premium ACTIVATED! (Founder — FREE)", Toast.LENGTH_LONG).show();
                    refreshState();
                    return;
                }
                // Stage 4: FairyChat backend (Render) se code verify hoga.
                if (code.matches("(?i)FC-[A-Z0-9]{4}-[A-Z0-9]{4}")) {
                    Toast.makeText(getContext(), "Backend verification jald aayegi — abhi founder code use karo (FC-FOUNDER-2026)", Toast.LENGTH_LONG).show();
                } else {
                    Toast.makeText(getContext(), "Code galat format me hai (FC-XXXX-XXXX)", Toast.LENGTH_SHORT).show();
                }
            }
        });
        redeemCard.addView(activate, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        root.addView(redeemCard, cardParams());

        TextView foot = new TextView(context);
        foot.setText("FairyChat Premium \u2022 Telegram engine ke upar bana");
        foot.setTextColor(sub);
        foot.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        foot.setGravity(Gravity.CENTER);
        foot.setPadding(0, pad, 0, pad);
        root.addView(foot, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        fragmentView = scroll;
        refreshState();
        return scroll;
    }

    private void refreshState() {
        boolean active = isPremiumActive(getContext());
        if (activeCard != null) {
            activeCard.setVisibility(active ? View.VISIBLE : View.GONE);
        }
        if (redeemCard != null) {
            redeemCard.setVisibility(active ? View.GONE : View.VISIBLE);
        }
        if (bannerSub != null) {
            bannerSub.setText(active
                ? "Premium ACTIVE \u2014 saare features unlocked! \uD83C\uDF89"
                : "Upgrade karke apni FairyChat ko\npoora personal banao!");
        }
    }

    private void addSectionTitle(Context c, LinearLayout root, String title, int txt) {
        TextView t = new TextView(c);
        t.setText(title);
        t.setTextColor(PURPLE);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setPadding(0, AndroidUtilities.dp(20), 0, AndroidUtilities.dp(8));
        root.addView(t, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
    }

    private LinearLayout card(Context c) {
        LinearLayout card = new LinearLayout(c);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(AndroidUtilities.dp(16), AndroidUtilities.dp(16), AndroidUtilities.dp(16), AndroidUtilities.dp(16));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(getThemedColor(Theme.key_windowBackgroundWhite));
        bg.setCornerRadius(AndroidUtilities.dp(14));
        bg.setStroke(AndroidUtilities.dp(1), 0x1A000000);
        card.setBackground(bg);
        return card;
    }

    private LinearLayout.LayoutParams cardParams() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = AndroidUtilities.dp(10);
        return lp;
    }

    private void addFeatureRow(Context c, LinearLayout root, String icon, String title, String desc, int txt, int sub) {
        LinearLayout row = new LinearLayout(c);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(AndroidUtilities.dp(6), AndroidUtilities.dp(10), AndroidUtilities.dp(6), AndroidUtilities.dp(10));

        TextView ic = new TextView(c);
        ic.setText(icon);
        ic.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        row.addView(ic, new LinearLayout.LayoutParams(
                AndroidUtilities.dp(44), LinearLayout.LayoutParams.WRAP_CONTENT));

        LinearLayout col = new LinearLayout(c);
        col.setOrientation(LinearLayout.VERTICAL);
        TextView t1 = new TextView(c);
        t1.setText(title);
        t1.setTextColor(txt);
        t1.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        t1.setTypeface(Typeface.DEFAULT_BOLD);
        col.addView(t1);
        TextView t2 = new TextView(c);
        t2.setText(desc);
        t2.setTextColor(sub);
        t2.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        t2.setPadding(0, AndroidUtilities.dp(2), 0, 0);
        col.addView(t2);
        row.addView(col, new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        root.addView(row, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
    }

    private void addPlanCard(Context c, LinearLayout root, String title, String price, String note, boolean best, int sub) {
        LinearLayout card = new LinearLayout(c);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(AndroidUtilities.dp(16), AndroidUtilities.dp(16), AndroidUtilities.dp(16), AndroidUtilities.dp(16));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(best ? 0xFFF8F1FF : getThemedColor(Theme.key_windowBackgroundWhite));
        bg.setCornerRadius(AndroidUtilities.dp(14));
        bg.setStroke(AndroidUtilities.dp(2), best ? PURPLE : 0x1A000000);
        card.setBackground(bg);

        TextView t = new TextView(c);
        t.setText(title);
        t.setTextColor(best ? PURPLE : getThemedColor(Theme.key_windowBackgroundWhiteBlackText));
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        card.addView(t);
        TextView p = new TextView(c);
        p.setText(price);
        p.setTextColor(getThemedColor(Theme.key_windowBackgroundWhiteBlackText));
        p.setTextSize(TypedValue.COMPLEX_UNIT_SP, 26);
        p.setTypeface(Typeface.DEFAULT_BOLD);
        p.setPadding(0, AndroidUtilities.dp(4), 0, 0);
        card.addView(p);
        TextView n = new TextView(c);
        n.setText(note);
        n.setTextColor(sub);
        n.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        n.setPadding(0, AndroidUtilities.dp(2), 0, 0);
        card.addView(n);
        root.addView(card, cardParams());
    }
}
