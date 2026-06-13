"""
BillingService.java equivalent — sample legacy Python billing module.
Intentionally has: god class, long methods, hardcoded credentials, high complexity.
"""
import hashlib
import requests  # external dep
from database import DatabaseManager  # internal dep
from user_service import UserService  # internal dep
from notification import NotificationService  # internal dep
from audit import AuditLogger  # internal dep


# Hardcoded credentials (intentional for demo)
DB_PASSWORD = "admin123"
API_KEY = "sk-legacy-api-key-abc123def456ghi789"
PAYMENT_GATEWAY_SECRET = "pg_secret_xK29mNqR7vTy"


class BillingService:
    """
    God class: handles billing, invoicing, payments, refunds, reports, and notifications.
    Should be split into: InvoiceService, PaymentService, RefundService, ReportService.
    """

    def __init__(self):
        self.db = DatabaseManager(password=DB_PASSWORD)
        self.user_service = UserService()
        self.notification = NotificationService()
        self.audit = AuditLogger()
        self.payment_url = "https://payment.legacy.internal/api"
        self.exchange_rates = {}
        self.tax_rates = {}
        self.discount_codes = {}
        self.pending_invoices = []
        self.processed_payments = []
        self.failed_payments = []
        self.refund_requests = []

    def process_payment(self, user_id, amount, currency, card_number, cvv, expiry):
        """Long method: processes payment with too many responsibilities."""
        # Step 1: Validate user
        user = self.user_service.get_user(user_id)
        if not user:
            return {"error": "User not found"}
        if not user.get("active"):
            return {"error": "User account inactive"}
        if user.get("blacklisted"):
            return {"error": "User blacklisted"}

        # Step 2: Validate card (should be in separate CardValidator class)
        if not card_number or len(str(card_number)) < 13:
            return {"error": "Invalid card number"}
        if not cvv or len(str(cvv)) < 3:
            return {"error": "Invalid CVV"}
        if not expiry:
            return {"error": "Invalid expiry"}

        # Step 3: Convert currency
        if currency != "USD":
            if currency in self.exchange_rates:
                amount = amount * self.exchange_rates[currency]
            else:
                response = requests.get(f"https://exchange.legacy.internal/rate/{currency}")
                rate = response.json().get("rate", 1.0)
                self.exchange_rates[currency] = rate
                amount = amount * rate

        # Step 4: Apply tax
        tax_rate = self.tax_rates.get(user.get("country", "US"), 0.0)
        tax_amount = amount * tax_rate
        total_amount = amount + tax_amount

        # Step 5: Apply discounts
        discount_code = user.get("discount_code")
        if discount_code and discount_code in self.discount_codes:
            discount = self.discount_codes[discount_code]
            total_amount = total_amount * (1 - discount)

        # Step 6: Check balance limits
        if total_amount > 50000:
            if not user.get("high_value_approved"):
                return {"error": "Transaction limit exceeded"}

        # Step 7: Call payment gateway
        payload = {
            "amount": total_amount,
            "card": card_number,
            "cvv": cvv,
            "expiry": expiry,
            "secret": PAYMENT_GATEWAY_SECRET,
        }
        try:
            resp = requests.post(self.payment_url + "/charge", json=payload, verify=False)
            if resp.status_code != 200:
                self.failed_payments.append({"user": user_id, "amount": total_amount})
                self.audit.log("PAYMENT_FAILED", user_id, total_amount)
                self.notification.send_email(user["email"], "Payment failed", f"Your payment of {total_amount} failed.")
                return {"error": "Payment gateway error"}
        except Exception as e:
            return {"error": str(e)}

        # Step 8: Record payment
        payment_id = hashlib.md5(f"{user_id}{total_amount}".encode()).hexdigest()
        self.processed_payments.append({
            "payment_id": payment_id,
            "user_id": user_id,
            "amount": total_amount,
            "tax": tax_amount,
            "currency": currency,
        })

        # Step 9: Create invoice
        invoice = self.create_invoice(user_id, total_amount, payment_id)

        # Step 10: Notify
        self.notification.send_email(
            user["email"],
            "Payment successful",
            f"Payment of ${total_amount:.2f} processed. Invoice: {invoice['id']}"
        )
        self.audit.log("PAYMENT_SUCCESS", user_id, total_amount)

        # Step 11: Update user billing history
        history = self.db.query(f"SELECT * FROM billing_history WHERE user_id = '{user_id}'")
        if history:
            self.db.execute(f"UPDATE billing_history SET total = total + {total_amount} WHERE user_id = '{user_id}'")
        else:
            self.db.execute(f"INSERT INTO billing_history (user_id, total) VALUES ('{user_id}', {total_amount})")

        return {"success": True, "payment_id": payment_id, "invoice": invoice}

    def create_invoice(self, user_id, amount, payment_id):
        invoice_id = hashlib.md5(f"INV-{user_id}-{payment_id}".encode()).hexdigest()[:8].upper()
        invoice = {
            "id": f"INV-{invoice_id}",
            "user_id": user_id,
            "amount": amount,
            "payment_id": payment_id,
            "status": "paid",
        }
        self.pending_invoices.append(invoice)
        self.db.execute(f"INSERT INTO invoices VALUES ('{invoice['id']}', '{user_id}', {amount})")
        return invoice

    def process_refund(self, payment_id, reason, amount=None):
        """Process a refund — should be in RefundService."""
        payment = next((p for p in self.processed_payments if p["payment_id"] == payment_id), None)
        if not payment:
            return {"error": "Payment not found"}
        refund_amount = amount or payment["amount"]
        if refund_amount > payment["amount"]:
            return {"error": "Refund amount exceeds original payment"}
        # Call refund endpoint
        resp = requests.post(self.payment_url + "/refund", json={
            "payment_id": payment_id,
            "amount": refund_amount,
            "secret": PAYMENT_GATEWAY_SECRET,
        }, verify=False)
        if resp.status_code != 200:
            return {"error": "Refund failed"}
        self.refund_requests.append({"payment_id": payment_id, "amount": refund_amount, "reason": reason})
        user = self.user_service.get_user(payment["user_id"])
        if user:
            self.notification.send_email(user["email"], "Refund processed", f"Refund of ${refund_amount:.2f} issued.")
        return {"success": True, "refund_amount": refund_amount}

    def generate_monthly_report(self, month, year):
        """Generate billing report — should be in ReportService."""
        total_revenue = sum(p["amount"] for p in self.processed_payments)
        total_refunds = sum(r["amount"] for r in self.refund_requests)
        net_revenue = total_revenue - total_refunds
        report = {
            "month": month,
            "year": year,
            "total_revenue": total_revenue,
            "total_refunds": total_refunds,
            "net_revenue": net_revenue,
            "transaction_count": len(self.processed_payments),
            "refund_count": len(self.refund_requests),
        }
        self.db.execute(f"INSERT INTO monthly_reports VALUES ({month}, {year}, {net_revenue})")
        return report

    def apply_discount(self, user_id, code, amount):
        if code not in self.discount_codes:
            return amount
        return amount * (1 - self.discount_codes[code])

    def get_user_billing_summary(self, user_id):
        payments = [p for p in self.processed_payments if p["user_id"] == user_id]
        refunds = [r for r in self.refund_requests if any(
            p["user_id"] == user_id and p["payment_id"] == r["payment_id"]
            for p in self.processed_payments
        )]
        return {
            "user_id": user_id,
            "total_paid": sum(p["amount"] for p in payments),
            "total_refunded": sum(r["amount"] for r in refunds),
            "invoice_count": len(payments),
        }

    def update_tax_rates(self, country, rate):
        self.tax_rates[country] = rate

    def add_discount_code(self, code, discount_pct):
        self.discount_codes[code] = discount_pct / 100.0

    def bulk_invoice(self, user_ids, amount, description):
        results = []
        for uid in user_ids:
            result = self.process_payment(uid, amount, "USD", "4111111111111111", "123", "12/26")
            results.append(result)
        return results
