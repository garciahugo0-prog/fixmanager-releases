import re

filepath = "/Users/hugogarciasanchez/Desktop/Fixmanager-electron_v1.87.0/src/utils/taecel.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the polling loop maxAttempts and pending status check
target_pattern = r"""      // Iniciar bucle de polling interno para obtener el folio de autorización
      let attempts = 0;
      const maxAttempts = 12; // 12 intentos \* 2s = 24 segundos máx
      const delayMs = 2000;
      
      while \(attempts < maxAttempts\) \{
        attempts\+\+;
        await new Promise\(resolve => setTimeout\(resolve, delayMs\)\);
        
        try \{
          const statusRes = await taecelCheckStatus\(\{
            config,
            transactionId: transId,
            folioInterno
          \}\);
          
          if \(statusRes\.success\) \{
            return \{
              success: true,
              message: 'Transacción procesada y autorizada con éxito\.',
              transactionId: transId,
              authorizationFolio: statusRes\.authorizationFolio,
              balance: statusRes\.balance
            \};
          \} else \{
            // Si el estatus reporta explícitamente un código definitivo que no es "0" \(pendiente\), detenemos el loop
            if \(statusRes\.status && statusRes\.status !== '0'\) \{
              return \{
                success: false,
                message: statusRes\.message \|\| 'Transacción fallida o rechazada por el operador\.'
              \};
            \}
          \}"""

replacement = """      // Iniciar bucle de polling interno para obtener el folio de autorización
      let attempts = 0;
      const maxAttempts = 20; // 20 intentos * 2s = 40 segundos máx
      const delayMs = 2000;
      
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        try {
          const statusRes = await taecelCheckStatus({
            config,
            transactionId: transId,
            folioInterno
          });
          
          if (statusRes.success) {
            return {
              success: true,
              message: 'Transacción procesada y autorizada con éxito.',
              transactionId: transId,
              authorizationFolio: statusRes.authorizationFolio,
              balance: statusRes.balance
            };
          } else {
            // Si el estatus reporta explícitamente un código definitivo que no es "3" (pendiente) ni "0" (pendiente inicial), detenemos el loop
            if (statusRes.status && statusRes.status !== '3' && statusRes.status !== '0') {
              return {
                success: false,
                message: statusRes.message || 'Transacción fallida o rechazada por el operador.'
              };
            }
          }"""

# Use regex with re.VERBOSE and re.DOTALL if needed, or simply string replacement
# Let's try direct string replace first which is safer if there are no regex characters
# We will read target content directly from the file to ensure a 100% exact match.
target_str = """      // Iniciar bucle de polling interno para obtener el folio de autorización
      let attempts = 0;
      const maxAttempts = 12; // 12 intentos * 2s = 24 segundos máx
      const delayMs = 2000;
      
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        try {
          const statusRes = await taecelCheckStatus({
            config,
            transactionId: transId,
            folioInterno
          });
          
          if (statusRes.success) {
            return {
              success: true,
              message: 'Transacción procesada y autorizada con éxito.',
              transactionId: transId,
              authorizationFolio: statusRes.authorizationFolio,
              balance: statusRes.balance
            };
          } else {
            // Si el estatus reporta explícitamente un código definitivo que no es "0" (pendiente), detenemos el loop
            if (statusRes.status && statusRes.status !== '0') {
              return {
                success: false,
                message: statusRes.message || 'Transacción fallida o rechazada por el operador.'
              };
            }
          }"""

if target_str in content:
    content = content.replace(target_str, replacement)
    print("Match found and replaced successfully!")
else:
    print("Exact match NOT found, trying regex...")
    # Clean up line endings difference if any
    content_normalized = content.replace("\r\n", "\n")
    target_normalized = target_str.replace("\r\n", "\n")
    if target_normalized in content_normalized:
        content = content_normalized.replace(target_normalized, replacement)
        print("Match found after normalization and replaced successfully!")
    else:
        print("Still not found!")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
