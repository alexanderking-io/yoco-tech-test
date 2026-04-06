package com.yoco.cashregister.service

import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Calculates VAT on a charge amount (VAT-exclusive).
 *
 * The charge amount does NOT include VAT. VAT is calculated on top:
 *   vatCents = chargeCents × vatRate / 10000
 *
 * Uses banker's rounding (HALF_EVEN) to eliminate systematic bias at scale.
 *
 * PRODUCTION NOTE: The VAT rate is currently hardcoded to 15% (South Africa).
 * In a production system, VAT rates would be configurable per jurisdiction and
 * could change over time. The rate is stored per fee row so historical charges
 * retain their original VAT calculation.
 */
object VatService {

    const val VAT_RATE_BASIS_POINTS = 1500 // 15%
    private val RATE = BigDecimal(VAT_RATE_BASIS_POINTS)
    private val DIVISOR = BigDecimal(10000)

    /**
     * Calculates VAT on a charge amount.
     *
     * @param chargeCents The charge amount in cents (VAT-exclusive)
     * @return The VAT amount in cents, rounded using banker's rounding
     */
    fun calculateVat(chargeCents: Long): Long {
        return BigDecimal(chargeCents)
            .multiply(RATE)
            .divide(DIVISOR, 0, RoundingMode.HALF_EVEN)
            .toLong()
    }
}
