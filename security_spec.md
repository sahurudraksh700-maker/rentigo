# RentKaro Firestore Security Specification

## 1. Data Invariants
1. **Identity Integrity**: A `Listing` can only be created when `ownerId == request.auth.uid` and `email_verified == true`. A `RentalRequest` can only be created when `renterId == request.auth.uid` and `renterId != ownerId`.
2. **PII Isolation**: Student phone numbers and emails live in `/users/{userId}/private/contact` and are readable/writable strictly by `userId == request.auth.uid`. `ownerContact` on `RentalRequest` must be `""` on creation and may only be populated by the listing owner during the `Pending -> Accepted` state transition.
3. **State Machine Integrity**: `RentalRequest.status` starts at `'Pending'`. Only the owner can transition `Pending -> Accepted` or `Pending -> Declined`, and `Accepted -> Returned`. Only the renter can transition `Pending -> Cancelled`. Terminal states (`Returned`, `Declined`, `Cancelled`) are immutable.
4. **Temporal & Volumetric Integrity**: All `createdAt`/`updatedAt` timestamps must equal `request.time`. All IDs match `^[a-zA-Z0-9_\\-]+$` (`<= 128` chars), and all strings and arrays (`photos <= 4`, `bookedRanges <= 50`) are strictly bounded.
5. **Query Security**: `rentalRequests` `list` queries enforce `resource.data.renterId == request.auth.uid || resource.data.ownerId == request.auth.uid` on the server rule.

## 2. The Dirty Dozen Adversarial Payloads
1. **Identity Spoofing on Listing**: Create `/listings/l1` with `ownerId: "victim_uid"` while authenticated as `attacker_uid` -> `PERMISSION_DENIED`.
2. **Self-Rental Bypass**: Create `/rentalRequests/r1` with `renterId == ownerId` -> `PERMISSION_DENIED`.
3. **Contact Leak on Request Creation**: Create `/rentalRequests/r1` with non-empty `ownerContact: "+919999999999"` -> `PERMISSION_DENIED`.
4. **Status Shortcutting**: Create `/rentalRequests/r1` with `status: "Accepted"` directly -> `PERMISSION_DENIED`.
5. **Renter Self-Accept**: Renter updates `/rentalRequests/r1` from `Pending` to `Accepted` -> `PERMISSION_DENIED`.
6. **Terminal State Mutation**: Owner updates `/rentalRequests/r1` when `existing().status == "Returned"` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection**: Create `/listings/l1` with extra key `"isFeatured": true` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Create `/listings/<200-char-invalid-id!>` -> `PERMISSION_DENIED`.
9. **Array Overflow**: Create `/listings/l1` with `photos` array of 5 strings -> `PERMISSION_DENIED`.
10. **PII Cross-Read**: Authenticated user A calls `get` on `/users/userB/private/contact` -> `PERMISSION_DENIED`.
11. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create a listing -> `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: Create `/listings/l1` with backdated `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`.
