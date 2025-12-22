# Author: UtachiCodes
from django.db import models
from .models import UploadedImage

class Taxi(models.Model):
    """Model to store taxi registration details"""
    plate_number = models.CharField(max_length=20, unique=True, verbose_name="License Plate")
    owner_name = models.CharField(max_length=100, verbose_name="Owner Name")
    vehicle_model = models.CharField(max_length=100, verbose_name="Vehicle Model")
    registration_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True, verbose_name="Is Active")

    class Meta:
        verbose_name = "Taxi"
        verbose_name_plural = "Taxis"

    def __str__(self):
        return f"{self.plate_number} - {self.owner_name}"

class PaymentStatus(models.Model):
    """Model to track payment status for taxis"""
    taxi = models.OneToOneField(Taxi, on_delete=models.CASCADE, related_name='payment_status')
    last_payment_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    is_paid = models.BooleanField(default=False, verbose_name="Has Paid")

    class Meta:
        verbose_name = "Payment Status"
        verbose_name_plural = "Payment Statuses"

    def __str__(self):
        return f"{self.taxi.plate_number} - {'Paid' if self.is_paid else 'Unpaid'}"

class CheckpointLog(models.Model):
    """Model to log when a taxi passes a checkpoint"""
    taxi = models.ForeignKey(Taxi, on_delete=models.CASCADE, null=True, blank=True, related_name='checkpoint_logs')
    unrecognized_plate = models.CharField(max_length=20, null=True, blank=True)
    image = models.OneToOneField(UploadedImage, on_delete=models.CASCADE, related_name='checkpoint_log')
    timestamp = models.DateTimeField(auto_now_add=True)
    location = models.CharField(max_length=100, default="Main Checkpoint")
    status_at_time = models.CharField(max_length=20, choices=[
        ('ALLOW', 'Allow'),
        ('STOP', 'Stop'),
        ('UNREGISTERED', 'Unregistered')
    ])

    class Meta:
        verbose_name = "Checkpoint Log"
        verbose_name_plural = "Checkpoint Logs"
        ordering = ['-timestamp']

    def __str__(self):
        plate = self.taxi.plate_number if self.taxi else self.unrecognized_plate
        return f"{plate} at {self.timestamp}"
